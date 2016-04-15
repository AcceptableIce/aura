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
 * @description Storage for component definitions. If persistent storage
 * is not available then most operations are noops.
 * @constructor
 * @protected
 */
function ComponentDefStorage(){}

/**
 * Target size, as a percent of max size, for component def storage during eviction.
 */
ComponentDefStorage.prototype.EVICTION_TARGET_LOAD = 0.75;

/**
 * Minimum head room, as a percent of max size, to allocate after eviction and adding new definitions.
 */
ComponentDefStorage.prototype.EVICTION_HEADROOM = 0.1;


/**
 * Whether to use storage for component definitions.
 * @returns {Boolean} whether to use storage for component definitions.
 */
ComponentDefStorage.prototype.useDefinitionStorage = function() {
    if (this.useDefStore === undefined) {
        this.setupDefinitionStorage();
    }
    return this.useDefStore;
};

/**
 * Creates storage to determine whether available storage mechanism is persistent
 * to store component definitions. Uses storage if persistent. Otherwise, don't use
 * storage to backup definitions.
 */
ComponentDefStorage.prototype.setupDefinitionStorage = function() {
    if (this.useDefStore === undefined) {
        this.useDefStore = false;

        // only persistently cache defs if actions is persistently cached. this is because
        // labels are stored in the GVP mechanism which is stored in actions. if labels
        // aren't persisted and defs are then components get rendered without labels (or with
        // the label placeholder in non-prod mode).

        var actions = Action.getStorage();
        if (actions && actions.isPersistent()) {

            var storage = $A.storageService.getStorage("ComponentDefStorage");
            var removeStorage = false;
            if (!storage) {
                // only create (and then remove) if the app hasn't defined one
                removeStorage = true;
                storage = $A.storageService.initStorage(
                    "ComponentDefStorage",  // name
                    true,           // persistent
                    false,          // secure
                    4096000,        // maxSize 4MB
                    10886400,       // defaultExpiration (1/2 year because we handle eviction ourselves)
                    0,              // defaultAutoRefreshInterval
                    true,           // debugLoggingEnabled
                    false           // clearStorageOnInit
                );
            }

            // def storage only enabled with persistent storage
            if (storage.isPersistent()) {
                this.definitionStorage = storage;
                // explicitly disable sweeping b/c AuraComponentService handles eviction
                this.definitionStorage.suspendSweeping();
                this.useDefStore = true;
            } else if (removeStorage) {
                $A.storageService.deleteStorage("ComponentDefStorage");
            }
        }
    }
};

/**
 * Gets the storage for component definitions.
 * @return {AuraStorage|null} the component def storage or null if it's disabled.
 */
ComponentDefStorage.prototype.getStorage = function () {
    if (this.useDefinitionStorage()) {
        return this.definitionStorage;
    }
};

/**
 * Stores component and library definitions into storage.
 * @param {Array} cmpConfigs the component definitions to store
 * @param {Array} libConfigs the lib definitions to store
 * @return {Promise} promise that resolves when storing is complete.
 */
ComponentDefStorage.prototype.storeDefs = function(cmpConfigs, libConfigs, context) {
    if (this.useDefinitionStorage() && (cmpConfigs.length || libConfigs.length)) {
        var promises = [];
        var descriptor, encodedConfig, i;

        for (i = 0; i < cmpConfigs.length; i++) {
            descriptor = cmpConfigs[i]["descriptor"];
            cmpConfigs[i]["uuid"] = context.findLoaded(descriptor);
            encodedConfig = $A.util.json.encode(cmpConfigs[i]);
            promises.push(this.definitionStorage.put(descriptor, encodedConfig));
        }

        for (i = 0; i < libConfigs.length; i++) {
            descriptor = libConfigs[i]["descriptor"];
            encodedConfig = $A.util.json.encode(libConfigs[i]);
            promises.push(this.definitionStorage.put(descriptor, encodedConfig));
        }

        return Promise["all"](promises).then(
            function () {
                $A.log("ComponentDefStorage: Successfully stored " + cmpConfigs.length + " components, " + libConfigs.length + " libraries");
            },
            function (e) {
                $A.warning("ComponentDefStorage: Error storing  " + cmpConfigs.length + " components, " + libConfigs.length + " libraries", e);
                throw e;
            }
        );
    }
    return Promise["resolve"]();
};

/**
 * Removes definitions from storage.
 * @param {String[]} descriptors the descriptors identifying the definitions to remove.
 * @return {Promise} a promise that resolves when the definitions are removed.
 */
ComponentDefStorage.prototype.removeDefs = function(descriptors) {
    if (this.useDefinitionStorage() && descriptors.length) {
        var promises = [];
        for (var i = 0; i < descriptors.length; i++) {
            promises.push(this.definitionStorage.remove(descriptors[i], true));
        }

        return Promise["all"](promises).then(
            function () {
                $A.log("ComponentDefStorage: Successfully removed " + promises.length + " descriptors");
            },
            function (e) {
                $A.log("ComponentDefStorage: Error removing  " + promises.length + " descriptors", e);
                throw e;
            }
        );
    }

    return Promise["resolve"]();
};


/**
 * Gets all definitions from storage.
 * @return {Promise} a promise that resolves with an array of the configs from storage. If decoding
 *  the configs fails the promise rejects. If the underlying storage fails or is disabled the promise
 *  resolves to an empty array.
 */
ComponentDefStorage.prototype.getAll = function () {
    if (!this.useDefinitionStorage()) {
        return Promise["resolve"]([]);
    }

    return this.definitionStorage.getAll().then(
        function(items) {
            var i, len, result = [];
            for (i = 0, len = items.length; i < len; i++) {
                var item = items[i];
                var config = $A.util.json.decode(item["value"]);
                if (config === null) {
                    throw new $A.auraError("Error decoding definition from storage: " + item["key"], null, $A.severity.QUIET);
                }
                result.push({ "key": item["key"], "value" : config });
            }

            return result;
        },
        function() {
            return [];
        }
    );
};

/**
 * Asynchronously retrieves all definitions from storage and adds to component service.
 * @return {Promise} a promise that resolves when definitions are restored.
 */
ComponentDefStorage.prototype.restoreAll = function(context) {
    var defRegistry = this;
    if (this.currentPromise) {
        return this.currentPromise;
    }

    this.currentPromise = this.getAll()
        .then(
            function(items) {
                var libCount = 0;
                var cmpCount = 0;

                // decode all items
                for (var i = 0; i < items.length; i++) {
                    var config = items[i]["value"];
                    if (config["includes"]) {
                        if (!$A.componentService.hasLibrary(config["descriptor"])) {
                            $A.componentService.saveLibraryConfig(config);
                        }
                        libCount++;
                    } else {
                        if (config["uuid"]) {
                            context.addLoaded(config["uuid"]);
                        }
                        if (!$A.componentService.getComponentDef(config)) {
                            $A.componentService.saveComponentConfig(config);
                        }
                        cmpCount++;
                    }
                }

                $A.log("ComponentDefStorage: restored " + cmpCount + " components, " + libCount + " libraries from storage into registry");
                defRegistry.currentPromise = null;
            }
        ).then(
            undefined, // noop
            function(e) {
                $A.log("ComponentDefStorage: error during restore from storage, no component or library defs restored", e);
                defRegistry.currentPromise = null;
            }
        );

    return this.currentPromise;
};

/**
 * Clears all definitions from storage.
 * @return {Promise} a promise that resolves when storage is cleared.
 */
ComponentDefStorage.prototype.clear = function() {
    if (this.useDefinitionStorage()) {
        return this.definitionStorage.clear();
    }
    return Promise["resolve"]();
};

Aura.Component.ComponentDefStorage = ComponentDefStorage;
