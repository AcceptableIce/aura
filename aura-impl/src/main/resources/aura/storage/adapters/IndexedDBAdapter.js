/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*jslint sub: true */
/**
 * @description The IndexedDB adapter for storage service implementation
 *
 * Some notes on the implementation:
 *
 * We do a single DB per table, which is wasteful, but simple. These databases are scoped to the page,
 * and so should not conflict across different applications. They are shared within a single app (as you
 * would expect).
 *
 * Sizing is approximate, and updates to sizes are very approximate. We recalculate when our error bars get
 * too big, or after a certain number of updates. This is locked to happen no more than once every 15 minutes
 * if our size is not over the limit.
 *
 * We sweep the database in three cases.
 * (1) getAll, since we have to.
 * (2) size or error bar over the limit.
 * (3) getSize, with an old size guess.
 * Sweeping the database always recalculates size, and if we are over the limit, we will re-sweep to clean the DB.
 *
 * @constructor
 */
IndexedDBStorageAdapter = function IndexedDBStorageAdapter(config) {
    this.instanceName = config["name"];
    this.sizeMax = config["maxSize"];
    this.debugLoggingEnabled = config["debugLoggingEnabled"];
    this.db = undefined;
    this.ready = undefined;
    this.pendingRequests = [];

    // FIXME: fix size calculation
    this.sizeLastReal = 0;
    this.sizeGuess = 0;
    this.sizeErrorBar = 0;
    this.sizeAge = 1000000;
    this.sizeAvg = 100;

    this.sizeMistake = 0;
    this.sizeMistakeMax = 0;
    this.sizeMistakeCount = 0;
    this.sizeOutsideErrorBar = 0;

    this.lastSweep = 0;
    this.sweepInterval = 15*60*1000;        // 15 minutes
    this.expiresFudge = 10000;              // 10 seconds
    this.limitSweepHigh = 0.9*this.sizeMax; // 90%
    this.limitSweepLow = 0.7*this.sizeMax;  // 70%
    this.limitItem = 0.25*this.sizeMax;     // 25% for a single item.
    this.limitError = 0.5*this.sizeMax;     // 50% for the error bar

    var context = $A.getContext();
    // objectStore name is the descriptor of current app or cmp
    this.tableName = (context && (context.app || context.cmp)) || "store";

    this.initialize();
};

IndexedDBStorageAdapter.NAME = "indexeddb";

/**
 * Get the name of the adapter.
 *
 * @public
 * @return the name of this adapter ("indexeddb")
 */
IndexedDBStorageAdapter.prototype.getName = function() {
    return IndexedDBStorageAdapter.NAME;
};

IndexedDBStorageAdapter.prototype.initialize = function(version) {
    // Set version number when changing schema ie adding index, etc
    var dbRequest,
        that = this;
    if (version) {
        // version is dynamic because it needs to be incremented when we need to create a objectStore
        // for the current app or cmp. IndexedDB only allows modifications to db or objectStore during
        // version change. Hence, we check for the existence of the table and increment the version
        // if it needs to be created
        dbRequest = window.indexedDB.open(this.instanceName, version);
    } else {
        dbRequest = window.indexedDB.open(this.instanceName);
    }
    dbRequest.onupgradeneeded = function (e) {
        that.createTables(e);
    };
    dbRequest.onsuccess = function(e) {
        that.setupDB(e);
    };
    dbRequest.onerror = function(e) {
        // this means we have no storage.
        that.ready = false;
        var message = "open() - Error opening DB";
        message += (e.target.error && e.target.error.message) ? ": " + e.target.error.message : "";
        that.log(message);
    };
    dbRequest.onblocked = function() {
        that.log("open() - Blocked from opening DB, most likely by another open browser tab");
    };
};

/**
 * Get the size of the database.
 *
 * Gets an 'approximate' size for the database.
 *
 * @public
 * @return a promise that will complete with the size.
 */
IndexedDBStorageAdapter.prototype.getSize = function() {
    var that = this;
    if (this.sizeAge < 50) {
        return new Promise(function(success) {
            success(that.sizeGuess);
        });
    } else {
        return this.enqueue(function(success, error) {
            that.walkInternal(success, error, false);
        });
    }
};

/**
 * Returns scope prefix text for keys;
 * @returns {String}
 * @private
 */
IndexedDBStorageAdapter.prototype.getScopedPrefix = function() {
    return this.scope + "_";
};

/**
 * Strips scope prefix from key and returns original key
 * @param {String} key key from storage with prefix
 * @returns {String}
 * @private
 */
IndexedDBStorageAdapter.prototype.stripScopedPrefix = function(key) {
    return key.replace(this.getScopedPrefix(), "");
};

/**
 * Get an item from the store by key.
 *
 * @param {*} key the key to look up.
 * @return {Promise} a promise that will complete with the item, null, or an error.
 */
IndexedDBStorageAdapter.prototype.getItem = function(key) {
    var that = this;
    var execute = function(success, error) {
        that.getItemInternal(key, success, error);
    };
    return this.enqueue(execute);
};

/**
 * Get all items from storage
 *
 * @returns {Promise} Promise with array of all rows
 */
IndexedDBStorageAdapter.prototype.getAll = function() {
    var that = this;
    var execute = function(success, error) {
        that.walkInternal(success, error, true);
    };
    return this.enqueue(execute);
};

/**
 * set an item in the db.
 *
 * @param {*} key the key.
 * @param {*} item the item to set.
 * @return a promise that will complete with either success (no value) or error.
 */
IndexedDBStorageAdapter.prototype.setItem = function(key, item) {
    var that = this;
    var execute = function(success, error) {
        that.setItemInternal(key, item, success, error);
    };
    return this.enqueue(execute);
};

/**
 * Remove an item from the database.
 *
 * @param {*} key the key to remove.
 * @return {Promise} a promise that will resolve when the operation finishes.
 */
IndexedDBStorageAdapter.prototype.removeItem = function(key) {
    var that = this;
    var execute = function(success, error) {
        that.removeItemInternal(key, success, error);
    };
    return this.enqueue(execute);
};

/**
 * Clear the database.
 *
 * @return {Promise} a promise that will resolve when the operation finishes.
 */
IndexedDBStorageAdapter.prototype.clear = function() {
    var that = this;
    var execute = function(success, error) {
        that.clearInternal(success, error);
    };
    return this.enqueue(execute);
};

/**
 * get the set of expired items.
 *
 * @return {Promise} a promise that will resolve when the operation finishes.
 */
IndexedDBStorageAdapter.prototype.sweep = function() {
    var that = this;
    var execute = function(success, error) {
        that.expireCache(0, success, error);
    };
    return this.enqueue(execute);
};


/**
 * Initialize the structure with a new DB.
 *
 * @private
 * @param {Event} event IndexedDB event
 */
IndexedDBStorageAdapter.prototype.setupDB = function(event) {
    var db = event.target.result;
    var self = this;
    this.db = db;
    this.db.onerror = function(e) {
        self.log("IndexedDBStorageAdapter error event called for " + self.instanceName, e);
    };
    this.db.onabort = function(e) {
        self.log("IndexedDBStorageAdapter abort event called for " + self.instanceName, e);
    };
    this.db.onversionchange = function(e) {
        self.log("IndexedDBStorageAdapter onversionchanged event called for " + self.instanceName, e);
        e.target.close();
    };

    if (!db.objectStoreNames.contains(this.tableName)) {
        // objectStore does not exist so increment version so we can create it
        var currentVersion = db["version"];
        db.close();
        this.initialize(currentVersion + 1);
    } else {
        this.ready = true;
        this.executeQueue();
    }
};

/**
 * Create tables in a new db.
 *
 * @private
 * @param {Event} event IndexedDB event
 */
IndexedDBStorageAdapter.prototype.createTables = function(event) {
    var db = event.target.result,
        transaction = event.target.transaction,
        objectStore;

    // these checks are required because IndexedDB will error on existing things

    if (!db.objectStoreNames.contains(this.tableName)) {
        // non existent table
        objectStore = db.createObjectStore(this.tableName, {"keyPath": "key"});
    } else if (transaction) {
        // existing table
        objectStore = transaction.objectStore(this.tableName);
    }

    if (objectStore) {
        if (!objectStore.indexNames.contains("expires")) {
            // check for existing index
            objectStore.createIndex("expires", "expires", {"unique": false});
        }
    }

};

/**
 * Run the stored queue of requests.
 *
 * This method is part of the startup sequence, wherein we queue actions as they come in until the database is
 * ready. Once the database is ready, this function executes everything in the queue.
 *
 * @private
 */
IndexedDBStorageAdapter.prototype.executeQueue = function() {
    var queue = this.pendingRequests;
    var idx;

    this.pendingRequests = [];
    for (idx = 0; idx < queue.length; idx++) {
        queue[idx]["execute"](queue[idx]["success"], queue[idx]["error"]);
    }
};

/**
 * Enqueue a function to execute.
 *
 * @param {function} execute the function to execute.
 * @return {Promise} a promise.
 */
IndexedDBStorageAdapter.prototype.enqueue = function(execute) {
    var that = this,
        promise;

    if (this.ready === false) {
        promise = new Promise(function(success, error) {
            error("IndexedDBStorageAdapter.enqueue: database failed to initialize");
        });
    } else if (this.ready === undefined) {
        promise = new Promise(function(success, error) {
            that.pendingRequests.push({ "execute":execute, "success":success, "error":error });
            if (that.ready !== undefined) {
                // rare race condition.
                that.executeQueue();
            }
        });
    } else {
        promise = new Promise(function(success, error) { execute(success, error); });
    }
    return promise;
};


/**
 * Internal routine to complete the promise.
 *
 * @param {*} key The key to retrieve.
 * @param {function} success the success callback from the promise
 * @param {function} error the error callback from the promise
 */
IndexedDBStorageAdapter.prototype.getItemInternal = function(key, success, error) {
    var transaction = this.db.transaction([this.tableName], "readonly");
    var objectStore = transaction.objectStore(this.tableName);
    var objectStoreRequest = objectStore.get(key);
    transaction.onabort = function(event) {
        error("IndexedDBStorageAdapter.getItem: Transaction aborted: "+event.error);
    };
    objectStoreRequest.onsuccess = function(event) {
        var item = event.target.result && event.target.result.item;
        item = item || null;
        success(item);
    };
    transaction.onerror = function(event) {
        error("IndexedDBStorageAdapter.getItem: Transaction failed: "+event.error);
    };
};

/**
 * Walk everything in the DB (read only).
 *
 * @param {function} success the success callback from the promise
 * @param {function} error the error callback from the promise
 * @param {boolean} sendResult should we send the full set of results instead of the size.
 */
IndexedDBStorageAdapter.prototype.walkInternal = function(success, error, sendResult) {
    var transaction = this.db.transaction([this.tableName], "readonly");
    var objectStore = transaction.objectStore(this.tableName);
    var cursor = objectStore.openCursor();
    var result = [];
    var count = 0;
    var size = 0;
    var that = this;

    cursor.onsuccess = function(event) {
        var icursor = event.target.result;
        if(icursor) {
            var store = icursor.value;
            if (store) {
                size += store['size'];
                count += 1;
                if (sendResult) {
                    var sent = {
                        "key": store["key"],
                        "value": store["item"]["value"],
                        "expires": store["expires"]
                    };
                    result.push(sent);
                }
            }
            icursor['continue']();
        } else {
            that.refreshSize(size, count);
            if (that.sizeGuess > that.limitSweepHigh) {
                that.expireCache(0);
            }
            if (sendResult) {
                success(result);
            } else {
                success(that.sizeGuess);
            }
        }
    };
    cursor.onerror = function(event) {
        error("IndexedDBStorageAdapter.getAll: Transaction failed: " + event.error);
    };
    cursor.onabort = function(event) {
        error("IndexedDBStorageAdapter.getAll: Transaction aborted: " + event.error);
    };
};

/**
 * set an item.
 *
 * @param {*} key the key to set.
 * @param {*} item the item to set for the key.
 * @param {function} success the promise success callback.
 * @param {function} error the promise error callback.
 */
IndexedDBStorageAdapter.prototype.setItemInternal = function(key, item, success, error) {
    var size = $A.util.estimateSize(key) + $A.util.estimateSize(item["value"]);
    var expires = +item["expires"];
    var that = this;
    if (!expires) {
        expires = new Date().getTime()+60000;
    }
    var storable = {
        "key":key,
        "item":item,
        "size":size,
        "expires": expires
    };
    if (size > this.limitItem) {
        error("IndexedDBStorageAdapter.setItem(): Item larger than size limit of " + this.limitItem);
        return;
    }
    if (size + this.sizeGuess + this.sizeErrorBar > this.limitSweepHigh || this.sizeErrorBar > this.limitError) {
        this.expireCache(size);
    }
    var transaction = this.db.transaction([this.tableName], "readwrite");
    var objectStore = transaction.objectStore(this.tableName);
    this.updateSize(size/2, size/2);

    var objectStoreRequest = objectStore.put(storable);
    transaction.onabort = function(event) {
        error("IndexedDBStorageAdapter.setItem: Transaction aborted: " + event.error);
    };
    objectStoreRequest.onsuccess = function() {
        success();
    };
    transaction.onerror = function(event) {
        that.log("DIED " + event.error);
        error("IndexedDBStorageAdapter.setItem: Transaction failed: " + event.error);
    };
};

/**
 * Remove an item from the database.
 *
 * @param {*} key the key to remove.
 * @param {function} success the success callback from the promise.
 * @param {function} error the error callback from the promise.
 */
IndexedDBStorageAdapter.prototype.removeItemInternal = function(key, success, error) {
    var transaction = this.db.transaction([this.tableName], "readwrite");
    var objectStore = transaction.objectStore(this.tableName);
    this.updateSize(-this.sizeAvg, this.sizeAvg);
    var removeRequest = objectStore['delete'](key);
    transaction.onabort = function(event) {
        error("IndexedDBStorageAdapter.removeItem: Transaction aborted: " + event.error);
    };
    removeRequest.onsuccess = function() {
        success();
    };
    transaction.onerror = function(event) {
        error("IndexedDBStorageAdapter.removeItem: Transaction failed: " + event.error);
    };
};

/**
 * Internal function to clear the DB.
 *
 * @param {function} success the success callback for the promise.
 * @param {function} error the error callback from the promise.
 */
IndexedDBStorageAdapter.prototype.clearInternal = function(success, error) {
    var transaction = this.db.transaction([this.tableName], "readwrite");
    var objectStore = transaction.objectStore(this.tableName);
    //FIXME: probably should do an object here.
    objectStore.clear();
    transaction.onabort = function(event) {
        error("IndexedDBStorageAdapter.clear: Transaction aborted: " + event.error);
    };
    transaction.oncomplete = function() {
        success();
    };
    transaction.onerror = function(event) {
        error("IndexedDBStorageAdapter.clear: Transaction failed: " + event.error);
    };
    this.setSize(0, 0);
};

/**
 * expire our cache, trying to free up a certain amount of space.
 *
 * @param {number} requestedSize the size we want to free.
 */
IndexedDBStorageAdapter.prototype.expireCache = function(requestedSize, success, error) {
    var now = new Date().getTime();
    if (this.lastSweep + this.sweepInterval > now && this.sizeGuess < this.limitSweepHigh) {
        this.log("Shortcircuiting sweep last sweep = "+this.lastSweep+", time = "+now);
        if (success) {
            success();
        }
        return;
    }
    this.lastSweep = now;
    try {
        var transaction = this.db.transaction([this.tableName], "readwrite");
        var objectStore = transaction.objectStore(this.tableName);
        var index = objectStore.index("expires");
        // FIXME: utilize bounds (range) with index
        var cursor = index.openCursor();
        var count = 0;
        var size = 0;
        var expiredSize = 0;
        var expireDate = now + this.expiresFudge;
        var that = this;
        var removeSize = requestedSize || 0;

        // if we are above the low water mark, sweep down to it.
        if (this.sizeGuess > this.limitSweepLow) {
            removeSize += this.sizeGuess-this.limitSweepLow;
        }
        this.log("Sweeping to remove "+removeSize);
        cursor.onsuccess = function(event) {
            var icursor = event.target.result;
            if (icursor) {
                var store = icursor.value;
                if (store) {
                    if (store["expires"] < expireDate || expiredSize < removeSize) {
                        that.log("Sweep: removing - "+icursor.primaryKey);
                        icursor['delete']();
                        expiredSize += store["size"];
                    } else {
                        size += store["size"];
                        count += 1;
                    }
                }
                icursor['continue']();
            } else {
                that.refreshSize(size, count);
                if (success) {
                    success();
                }
                if (size > this.limitSweepHigh) {
                    this.expireCache(0);
                }
            }
        };
        cursor.onerror = function(event) {
            if (error) {
                error("IndexedDBStorageAdapter.getAll: Transaction failed: "+event.error);
            }
        };
        cursor.onabort = function(event) {
            if (error) {
                error("IndexedDBStorageAdapter.getAll: Transaction aborted: "+event.error);
            }
        };
    } catch (e) {
        throw e;
    }
};

/**
 * Update the guessed size of the db.
 *
 * @param {number} sizeChange the amount to change the size of the db.
 * @param {number} error a really random guess of the size of the error.
 */
IndexedDBStorageAdapter.prototype.updateSize = function(sizeChange, error) {
    this.sizeGuess += sizeChange;
    this.sizeErrorBar += error;
    this.sizeAge += 1;
};

/**
 * Refresh the size of the DB from real data.
 *
 * @param {number} size the actual calculated size.
 * @param {number} count the number of items in the DB.
 */
IndexedDBStorageAdapter.prototype.refreshSize = function(size, count) {
    var mistake = this.sizeGuess - size;
    if (mistake < 0) {
        mistake = -mistake;
    }
    if (mistake > this.sizeMistakeMax) {
        this.sizeMistakeMax = mistake;
    }
    this.sizeMistake += mistake;
    this.sizeMistakeCount += 1;
    if (mistake > this.sizeErrorBar) {
        this.sizeOutsideErrorBar += 1;
    }

    this.log("Size Calculation: mistake = "+mistake+", avg = "+(this.sizeMistake/this.sizeMistakeCount)+
        ", max = "+this.sizeMistakeMax+", outside error bars = "+this.sizeOutsideErrorBar);
    this.setSize(size, count);
};

/**
 * Set the size of the DB from real data.
 *
 * @param {number} size the actual calculated size.
 * @param {number} count the number of items in the DB.
 */
IndexedDBStorageAdapter.prototype.setSize = function(size, count) {
    this.sizeLastReal = size;
    this.sizeGuess = size;
    this.sizeErrorBar = 0;
    this.sizeAge = 0;
    if (count > 0) {
        this.sizeAvg = size/count;
    }
};

IndexedDBStorageAdapter.prototype.log = function (msg, obj) {
    if (this.debugLoggingEnabled) {
        $A.log("IndexedDBStorageAdapter '" + this.instanceName + "' " + msg + ":", obj);
    }
};

/**
 * Deletes the ENTIRE db which may contain tables belonging to other app/cmp
 * @return {Promise} promise that deletes the entire database
 */
IndexedDBStorageAdapter.prototype.deleteStorage = function() {
    var that = this;
    var execute = function(success, error) {
        that.deleteStorageInternal(success, error);
    };
    return this.enqueue(execute);
};

IndexedDBStorageAdapter.prototype.deleteStorageInternal = function(success, error) {
    var that = this;

    // IE and Safari need to be explicitly closed otherwise may end up stuck in a blocked state
    this.db.close();

    var dbRequest = window.indexedDB.deleteDatabase(this.instanceName);
    dbRequest.onerror = function() {
        error("IndexedDBStorageAdapter.deleteStorage: Database failed to be deleted");
    };
    dbRequest.onsuccess = function() {
        that.log("deleted successfully");
        success();
    };
    dbRequest.onblocked = function(event) {
        // Cannot error here because IE may come to this callback before success
        that.log("blocked from being deleted");
    };
};

// Only register this adapter if the IndexedDB API is present
if (window.indexedDB) {
    $A.storageService.registerAdapter({
        "name": IndexedDBStorageAdapter.NAME,
        "adapterClass": IndexedDBStorageAdapter,
        "persistent": true
    });
}

Aura.Storage.IndexedDBStorageAdapter = IndexedDBStorageAdapter;
