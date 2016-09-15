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
/**
 * AuraXHR: struct used to represent a connection.
 *
 * @private
 */
Aura.Services.AuraClientServiceMarker = 0;

Aura.Services.AuraClientService$AuraXHR = function AuraXHR() {
    this.length = 0;
    this.marker = 0;
    this.request = undefined;
    this.actions = {};
};

/**
 * Reset the xhr.
 */
Aura.Services.AuraClientService$AuraXHR.prototype.reset = function() {
    this.request = undefined;
    this.actions = {};
};

/**
 * add an action.
 */
Aura.Services.AuraClientService$AuraXHR.prototype.addAction = function(action) {
    if (action) {
        if (this.actions[""+action.getId()]) {
            throw new $A.auraError("Adding duplicate action", null, $A.severity.QUIET);
        }
        this.actions[""+action.getId()] = action;
    }
};

/**
 * get an action for a response.
 */
Aura.Services.AuraClientService$AuraXHR.prototype.getAction = function(id) {
    var action = this.actions[id];

    if (action) {
        this.actions[id] = undefined;
    }
    return action;
};

/**
 * A handy structure to hold data.
 *
 * @private
 */
Aura.Services.AuraClientService$AuraActionCollector = function AuraActionCollector() {
    // Collected client actions for execution.
    this.clientActions = [];
    this.clientIndex = 0;

    // collected server actions to send.
    this.actionsToCollect = 0;
    this.collected = [];
    this.collecting = [];

    // collected server actions to complete (stored)
    this.actionsToComplete = [];
    this.completionIndex = 0;

    this.collectedStorableActions = [];

    // server actions completed.
    this.actionsCompleted = 0;
};


/**
 * @description The Aura Client Service.
 *
 * There be dragons here.
 *
 * Manage the queue of actions sent to the server.
 *
 * Queue Processing Notes:
 *  * The queue is processed synchronously, but almost all of the interesting functionality occurs asynchronously.
 *  * client actions are run in a single flow of setTimeout calls.
 *  * storable server actions get processed in the "then" clause of the promise
 *  * non-storable server actions are processed synchronously.
 *
 * Input conditions:
 * We have a queue of actions that are inserted vie enqueueAction.
 *
 * Dangers:
 *  * Race conditions.
 *  * caboose actions.
 *  * problems with storage.
 *  * complexity of code due to asynchronicity.
 *
 * Tradeoffs:
 *  * number of actions boxcarred.
 *  * actions in flight
 *  * sending XHR early vs. late.
 *
 * Processing Loop:
 *  * gather actions into a collector.
 *  * walk each action, queueing up server actions to retrieve from storage and client actions to execute.
 *  * execute client actions with setTimeout(0) to allow server actions to complete.
 *  * As server actions come back from storage, queue up for execution, and queue refresh actions to refresh.
 *  * After all actions collect, check for further actions in the queue, restart loop if there are some.
 *  * Once we have finished processing all actions, check for actions to be put in an XHR.
 *    + All foreground actions go in a single XHR, and are de-duped on send.
 *    + background actions are sent one per XHR, with a de-dupe step during the queue walk.
 *    + deferred actions are sent if we are idle, with a de-dupe step during the queue walk.
 *
 * Queues:
 *  * actionsQueued - queue of actions that have yet to be processed.
 *  * actionsDeferred - actions that have been processed through storage, but need to go to the server.
 *
 * @constructor
 * @export
 */
function AuraClientService () {
    this._host = "";
    this._token = null;
    this._isDisconnected = false;
    this._parallelBootstrapLoad = true;
    this.auraStack = [];
    this.appcacheDownloadingEventFired = false;
    this.isOutdated = false;
    this.finishedInitDefs = false;
    this.protocols={"layout":true};
    this.namespaces={internal:{},privileged:{}};
    this.lastSendTime = Date.now();
    this.clientLibraries = {};

    // TODO - what is this used for?
    this.appCache = true;
    // whether an appcache error event has been received
    this.appCacheError = false;

    // This will be only changed after the unload event
    this._appNotTearingDown = true;

    // XHR timeout (milliseconds)
    this.xhrTimeout = undefined;

    // bootstrap.js value used to boot the app. populated after a bootstrap version
    // is successfully loaded, processed, and merged.
    this.appBootstrap;

    // cookie name to force boostrap.js to the server (aka skip cache). done as a cookie so the server
    // can set this flag if ever required.
    this._disableBootstrapCacheCookie = "auraDisableBootstrapCache";

    this.NOOP = function() {};

    var auraXHR = new Aura.Services.AuraClientService$AuraXHR();
    this.availableXHRs = [ auraXHR ];
    this.allXHRs = [ auraXHR ];
    this.actionStoreMap = {};
    this.collector = undefined;
    // FIXME: this will go away in iteration 3.
    this.setQueueSize(4);

    this.actionsQueued = [];
    this.actionsDeferred = [];

    // guess at xhr type.
    if (window.XMLHttpRequest) {
        this.httpType = 'generic';
    } else {
        this.httpType = undefined;
    }

    this._disconnected = undefined;

    // queue of functions to run when no XHRs in flight
    this.xhrIdleQueue = [];

    //
    // Run client actions synchronously. This is the previous behaviour.
    //
    this.optionClientSynchronous = true;

    this.reloadFunction = undefined;
    this.reloadPointPassed = false;

    // a map of action keys limited to those visible to the current browser tab.
    //
    // actions can depend on defs. defs are loaded at framework init and so the same
    // must be done for actions: loaded at framework init. otherwise storable actions
    // may get cache hits that reference defs the current tab does not have in a
    // multi-tab scenario.
    //
    // if action storage doesn't exist no filtering is required. if action storage isn't
    // persistent then the actions cache is inherently scoped to the current tab.
    this.persistedActionFilter = undefined;

    this.handleAppCache();

}

/**
 * Storage key for CSRF token.
 * TODO W-2531907 - Get/set done directly against the adapter because pre-200 non-Aura clients modified this value
 * direclty in SSA prior to Aura booting. Instead Aura should handle CSRF/invalid session issues, then this key/value
 * can operate against AuraStorage.
 * TODO W-2481519 - use a dedicated storage (not actions) for this framework-internal data to avoid eviction blacklists
 * in every adapter.
 */
AuraClientService.TOKEN_KEY = "$AuraClientService.token$";

/**
 * Storage key for bootstrap.js
 * TODO W-2481519 - use a dedicated storage (not actions) for this framework-internal data to avoid eviction blacklists
 * in every adapter.
 */
AuraClientService.BOOTSTRAP_KEY = "$AuraClientService.bootstrap$";

/**
 * set the queue size.
 *
 * This is a one time set for the queue size. Any further attempts will be ignored.
 * This should become a configuration parameter at some point.
 *
 * @private
 */
AuraClientService.prototype.setQueueSize = function(queueSize) {
    var auraXHR;
    if (this.allXHRs.length === 1) {
        for (var i = 1; i < queueSize; i+= 1) {
            auraXHR = new Aura.Services.AuraClientService$AuraXHR();
            this.availableXHRs.push(auraXHR);
            this.allXHRs.push(auraXHR);
        }
    }
};

/**
 * Mark all currently queued (but not sent) actions as 'deferred'.
 *
 * This is intended for use when components are kept 'alive' after they are no longer on the screen for better
 * performance going back and forth between various displays.
 */
AuraClientService.prototype.deferPendingActions = function() {
    var i;
    var action;

    for (i = 0; i < this.actionsQueued.length; i++) {
        action = this.actionsQueued[i];
        if (action) {
            action.setDeferred();
        }
    }
    for (i = 0; i < this.actionsDeferred.length; i++) {
        action = this.actionsDeferred[i];
        if (action) {
            action.setDeferred();
        }
    }
    if (this.collector) {
        for (i = 0; i < this.collector.collecting.length; i++) {
            action = this.collector.collecting[i];
            if (action) {
                action.setDeferred();
            }
        }
    }
};

//#if {"excludeModes" : ["PRODUCTION"]}
AuraClientService.prototype.getSourceMapsUrl = function (descriptor, type) {
    if (window.location) {
        var splitChar = ':';
        var folder = '/components/';

        if (type === 'lib') {
            splitChar = '.';
            folder = '/libraries/';
        }

        var parts = descriptor.split('://').pop().split(splitChar);
        return [window.location.origin, folder, parts.join('/'),'.js'].join('');
    }
};
//#end

/**
 * Take a json (hopefully) response and decode it. If the input is invalid JSON, we try to handle it gracefully.
 *
 * @param {XmlHttpRequest} response the XHR object.
 * @param {Boolean} [noStrip] true to not strip off the JSON hijacking prevention (while(1) prefix).
 * @param {Boolean} [timedOut] true if the XHR timed out; false otherwise.
 * @returns {Object} An object with properties 'status', which represents the status of the response, and potentially
 *          'message', which contains the decoded server response or an error message.
 */
AuraClientService.prototype.decode = function(response, noStrip, timedOut) {
    var ret = {};

    var e;

    // timed out or failure to communicate with server
    if (timedOut || this.isDisconnectedOrCancelled(response)) {
        this.setConnected(false);
        ret["status"] = "INCOMPLETE";
        return ret;
    }

    //
    // If a disconnect event was previously fired, fire a connection
    // restored event
    // now that we have a response from a server.
    //
    if (this._isDisconnected) {
        e = $A.eventService.getNewEvent("markup://aura:connectionResumed");
        if (e) {
            this._isDisconnected = false;
            e.fire();
        }
    }

    var text = response["responseText"];

    if (/^\s*</.test(text)) {
        //
        // This is what happens when someone hands us a pile of HTML
        // instead of JSON. There is no real hope of dealing with it,
        // so just flag an error, and carry on.
        //
        //#if {"excludeModes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
        ret["message"] = "Communication error, invalid JSON: " + text;
        // #end
        // #if {"modes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
        ret["message"] = "Communication error, please retry or reload the page";
        // #end
        ret["status"] = "ERROR";
        return ret;
    }

    //
    // server-side explosion. The new message is one where there is an /*ERROR*/ appended.
    // this allows us to deal with the fact that we can get errors after the send has started.
    // Of course, we also have the problem that we might not have valid JSON at all, in which case
    // we have further problems...
    //
    var status = response["status"];
    if ((status !== 200) || $A.util.stringEndsWith(text, "/*ERROR*/")) {
        if (status === 200) {
            // if we encountered an exception once the response was committed
            // ignore the malformed JSON
            text = "/*" + text;
        } else if (!noStrip === true && text.charAt(0) === "w") {
            //
            // strip off the while(1) at the beginning
            //
            text = "//" + text;
        }
        var resp = $A.util.json.decode(text, true);

        // if the error on the server is meant to trigger a client-side event...
        if ($A.util.isUndefinedOrNull(resp)) {
            //#if {"excludeModes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
            ret["message"] = "Communication error, invalid JSON: " + text;
            // #end
            // #if {"modes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
            ret["message"] = "Communication error, please retry or reload the page";
            // #end
            ret["status"] = "ERROR";

            // in case stale application cache, handling old exception code
            var appCache = window.applicationCache;
            if (appCache && (appCache.status === appCache.IDLE || appCache.status > appCache.DOWNLOADING)) {
                try {
                    appCache.update();
                } catch (ignore) {
                    //
                    // not sure what we should do here. but since this seems to only happen in corner cases
                    // we'll ignore this one for now.
                    //
                }
            }
            return ret;
        } else if (resp["exceptionEvent"] === true) {
            this.throwExceptionEvent(resp);
            ret["status"] = "ERROR";
            ret["message"] = "Received exception event from server";
            return ret;
        } else {
            // !!!!!!!!!!HACK ALERT!!!!!!!!!!
            // The server side actually returns a response with 'message' and 'stack' defined
            // when there was a server side exception. Unfortunately, we don't really know what
            // we have... the code in aura.error has checks for those, but if they are not
            // there the error message will be meaningless. This code thu does much the same
            // thing, but in a different way so that we get a real error message.
            // !!!!!!!!!!HACK ALERT!!!!!!!!!!
            //#if {"excludeModes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
            if (resp["message"] && resp["stack"]) {
                ret["message"] = resp["message"] + "\n" + resp["stack"];
            } else {
                ret["message"] = "Communication error, invalid JSON: " + text;
            }
            // #end
            // #if {"modes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
            if (resp["message"]) {
                ret["message"] = resp["message"];
            } else {
                ret["message"] = "Communication error, please retry or reload the page";
            }
            // #end
            ret["status"] = "ERROR";
            return ret;
        }
    }
    //
    // strip off the while(1) at the beginning
    //
    if (!noStrip === true && text.charAt(0) === "w") {
        text = "//" + text;
    }

    var responseMessage = $A.util.json.decode(text);
    if ($A.util.isUndefinedOrNull(responseMessage)) {
        //#if {"excludeModes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
        ret["message"] = "Communication error, invalid JSON: " + text;
        // #end
        // #if {"modes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
        ret["message"] = "Communication error, please retry or reload the page";
        // #end
        ret["status"] = "ERROR";
        return ret;
    }

    if ("actions" in responseMessage) {
        $A.util.json.resolveRefsObject(responseMessage["actions"]);
    }

    ret["status"] = "SUCCESS";
    ret["message"] = responseMessage;
    return ret;
};

/**
 * Fire an event exception from the wire.
 *
 * This is published, but only for use in the case of an event exception serialized as JS,
 * not sure if this is important.
 *
 * @param {Object} config The data for the exception event
 * @memberOf AuraClientService
 * @private
 */
AuraClientService.prototype.throwExceptionEvent = function(resp) {
    var evtObj = resp["event"];
    var descriptor = evtObj["descriptor"];
    var values = evtObj["attributes"] && evtObj["attributes"]["values"];

    if (evtObj["eventDef"]) {
        // register the event with the EventDefRegistry
        $A.eventService.createEventDef(evtObj["eventDef"]);
    }

    if ($A.eventService.hasHandlers(descriptor)) {
        var evt = $A.eventService.getNewEvent(descriptor);
        if (evtObj["attributes"]) {
            evt.setParams(values);
        }

        evt.fire();
    } else {
        try {
            $A.util.json.decodeString(resp["defaultHandler"])(values);
        } catch (e) {
            throw new $A.auraError("Error in defaultHandler for event: " + descriptor, e, $A.severity.QUIET);
        }
    }
};

AuraClientService.prototype.fireDoneWaiting = function() {
    $A.eventService.getNewEvent("markup://aura:doneWaiting").fire();
};

/**
 * This will be called by the unload event
 *
 * @private
 */
AuraClientService.prototype.tearDown = function() {
    this._appNotTearingDown = false;
};


/**
 * Initializes the clientLibraries sent as part of the lazy HTML scripts
 * This will be called before instanciating the app 
 * @private
*/
AuraClientService.prototype.initializeClientLibraries = function () {
// Lazy load data-src scripts
    var scripts = document.getElementsByTagName("script");
    if (scripts) {
        for ( var i = 0, len = scripts.length; i < len; i++) {
            var script = scripts[i];
            if (script.getAttribute("data-src") && !script.getAttribute("src")) {
                var source = script.getAttribute("data-src");
                var name = source.split('/').pop().split('.').shift();
                this.clientLibraries[name.toLowerCase()] = {
                    script : script,
                    loaded : false,
                    loading : []
                };
            }
        }
    }
};

/**
 * Load ClientLibraries
 * @export
 */
AuraClientService.prototype.loadClientLibrary = function(name, callback) {
    var lib = this.clientLibraries[name.toLowerCase()];
    $A.assert(lib, 'ClientLibrary has not been registered');

    if (lib.loaded) {
        return callback();
    }

    lib.loading.push($A.getCallback(callback));

    function afterLoad() {
        lib.loaded = true;
        for (var i in lib.loading) {
            lib.loading[i]();
        }
        lib.loading = [];
    }

    lib.script.onload = afterLoad;
    lib.script.onerror = afterLoad;
    lib.script.src = lib.script.getAttribute('data-src');
};


/**
 * make the current thread be 'in aura collections'
 *
 * @private
 */
AuraClientService.prototype.setInCollection = function() {
    this.auraStack.push("AuraClientService$collection");
};

/**
 * release the current thread from 'in aura collections'
 *
 * @private
 */
AuraClientService.prototype.clearInCollection = function() {
    var name = this.auraStack.pop();
    $A.assert(name === "AuraClientService$collection");
};

AuraClientService.prototype.isDisconnectedOrCancelled = function(response) {
    if (response && response.status) {
        if (response.status === 0) {
            return true;
        } else if (response.status >= 12000 && response.status < 13000) {
            // WINHTTP CONNECTION ERRORS
            return true;
        }
    } else {
        return true;
    }
    return false;
};

/**
 * Process a single action/response.
 *
 * Note that it does this inside an $A.run to provide protection against error returns, and to notify the user if an
 * error occurs.
 *
 * @param {Action} action the action.
 * @param {Object} actionResponse the server response.
 * @private
 */
AuraClientService.prototype.singleAction = function(action, actionResponse) {
    var needUpdate, needsRefresh;

    try {
        // Force the transaction id to 'this' action, so that we maintain chains.
        needUpdate = action.updateFromResponse(actionResponse);
        needsRefresh = action.isRefreshAction();

        if (!action.abortIfComponentInvalid(false)) {
            if (needUpdate) {
                action.finishAction($A.getContext());
            }
            if (needsRefresh) {
                action.fireRefreshEvent("refreshEnd", needUpdate);
            }
        }
    } catch (e) {
        if (e instanceof $A.auraError) {
            throw e;
        } else {
            var wrapper = new $A.auraError(null, e);
            wrapper.action = action;
            throw wrapper;
        }
    }
};

AuraClientService.prototype.isBB10 = function() {
    var ua = navigator.userAgent;
    return (ua.indexOf("BB10") > 0 && ua.indexOf("AppleWebKit") > 0);
};

AuraClientService.prototype.getManifestURL = function() {
    var htmlNode = document.body.parentNode;
    return htmlNode ? htmlNode.getAttribute("manifest") : null;
};

AuraClientService.prototype.isManifestPresent = function() {
    return !!this.getManifestURL();
};

/**
 * Count the available XHRs.
 */
AuraClientService.prototype.countAvailableXHRs = function(/*isBackground*/) {
    return this.availableXHRs.length;
};

/**
 * Get an available XHR.
 *
 * Used for instrumentation
 *
 * @param {Boolean} isBackground is the XHR for a background action.
 */
AuraClientService.prototype.getAvailableXHR = function(isBackground) {
    if (isBackground && this.availableXHRs.length === 1) {
        // FIXME: this is bogus and will change.
        return null;
    }
    var auraXHR = this.availableXHRs.pop();
    return auraXHR;
};

/**
 * Release an xhr back in to the pool.
 *
 * @export
 */
AuraClientService.prototype.releaseXHR = function(auraXHR) {
    auraXHR.reset();
    this.availableXHRs.push(auraXHR);

    if (this.inFlightXHRs() === 0) {
        this.processXHRIdleQueue();
    }
};


/**
 * Perform hard refresh
 *
 * This is part of the appcache refresh, forcing a reload while
 * avoiding the appcache which is important for system such as
 * Android such doesn't adhere to window.location.reload(true)
 * and still uses appcache.
 *
 * @memberOf AuraClientService
 * @export
 */
AuraClientService.prototype.hardRefresh = function() {
    var url = location.href;
    if (!this.isManifestPresent() || url.indexOf("?nocache=") > -1) {
        location.reload(true);
        return;
    }

    // if BB10 and using application cache
    if (this.isBB10() && window.applicationCache
        && window.applicationCache.status !== window.applicationCache.UNCACHED) {
        url = location.protocol + "//" + location.host + location.pathname + "?b=" + Date.now();
    }

    // replace encoding of spaces (%20) with encoding of '+' (%2b) so that when request.getParameter is called in the server, it will decode back to '+'.
    var params = "?nocache=" + encodeURIComponent(url).replace(/\%20/g,"%2b");
    // insert nocache param here for hard refresh
    var hIndex = url.indexOf("#");
    var qIndex = url.indexOf("?");
    var cutIndex = -1;
    if (hIndex > -1 && qIndex > -1) {
        cutIndex = (hIndex < qIndex) ? hIndex : qIndex;
    } else if (hIndex > -1) {
        cutIndex = hIndex;
    } else if (qIndex > -1) {
        cutIndex = qIndex;
    }

    if (cutIndex > -1) {
        url = url.substring(0, cutIndex);
    }


    var sIndex = url.lastIndexOf("/");
    var appName = url.substring(sIndex+1,url.length);
    var newUrl = appName + params;
    //use history.pushState to change the url of current page without actually loading it.
    //AuraServlet will force the reload when GET request with current url contains '?nocache=someUrl'
    //after reload, someUrl will become the current url.
    //state is null: don't need to track the state with popstate
    //title is null: don't want to set the page title.
    history.pushState(null,null,newUrl);

    //fallback to old way : set location.href will trigger the reload right away
    //we need this because when AuraResourceServlet's GET request with a 'error' cookie,
    //AuraServlet doesn't get to do the GET reqeust
    if( (location.href).indexOf("?nocache=") > -1 ) {
        location.href = (url + params);
    }
};

AuraClientService.prototype.isDevMode = function() {
    var context = $A.getContext();
    return !$A.util.isUndefined(context) && context.getMode() === "DEV";
};

/**
 * the code to
 * @private
 */
AuraClientService.prototype.actualDumpCachesAndReload = function() {
    // reload after clearing the persistent caches
    $A.componentService.clearDefsFromStorage({"cause": "appcache"}).then(
        function() {
            window.location.reload(true);
        }
    );
};

/**
 * Clears actions and ComponentDefStorage stores then reloads the page.
 */
AuraClientService.prototype.dumpCachesAndReload = function() {
    if (this.reloadFunction) {
        return;
    }

    this.reloadFunction = this.actualDumpCachesAndReload.bind(this);

    if (this.reloadPointPassed) {
        this.reloadFunction();
    }
};

AuraClientService.prototype.handleAppCache = function() {

    var acs = this;

    function showProgress(progress) {
        var progressContEl = document.getElementById("auraAppcacheProgress");
        if (progressContEl) {
            if (progress > 0 && progress < 100) {
                progressContEl.style.display = "block";
                var progressEl = progressContEl.firstChild;
                progressEl.firstChild.style.width = progress + "%";
            } else if (progress >= 100) {
                progressContEl.style.display = "none";
            } else if (progress < 0) {
                progressContEl.className = "error";
            }
        }
    }

    function handleAppcacheChecking() {
        document._appcacheChecking = true;
    }

    function handleAppcacheUpdateReady() {
        acs.appCache = false;
        var appCache = window.applicationCache;
        if (appCache.swapCache && appCache.status === appCache.UPDATEREADY) {
            try {
                appCache.swapCache();
            } catch(ignore) {
                // protect against InvalidStateError with swapCache even when UPDATEREADY (weird)
            }
        }
        acs.dumpCachesAndReload();
    }

    function handleAppcacheError(e) {
        acs.appCacheError = true;
        if (e.stopImmediatePropagation) {
            e.stopImmediatePropagation();
        }
        if (window.applicationCache
            && (window.applicationCache.status === window.applicationCache.UNCACHED ||
                window.applicationCache.status === window.applicationCache.OBSOLETE)) {
            return;
        }

        /**
         * BB10 triggers appcache ERROR when the current manifest is a 404.
         * Other browsers triggers OBSOLETE and we refresh the page to get
         * the new manifest.
         *
         * For BB10, we append cache busting param to url to force BB10 browser
         * not to use cached HTML via hardRefresh
         */
        if (acs.isBB10()) {
            acs.hardRefresh();
        }

        if (acs.isDevMode()) {
            showProgress(-1);
        }

        if (acs.appcacheDownloadingEventFired && acs.isOutdated) {
            acs.appCache = false;
            // Hard reload if we error out trying to download new appcache
            $A.log("Outdated.");
            acs.dumpCachesAndReload();
            return;
        }

        // if bootstrap has failed then the app is stuck. if appcache has also errored then
        // force a server trip to allow for a server-side redirect or get a new manifest.
        if (Aura["appBootstrapStatus"] === "failed" && Aura["appBootstrapCacheStatus"] === "failed") {
            acs.hardRefresh();
        }

    }

    function handleAppcacheDownloading(e) {
        acs.appCache = false;

        if (acs.isDevMode()) {
            var progress = Math.round(100 * e.loaded / e.total);
            showProgress(progress + 1);
        }

        acs.appcacheDownloadingEventFired = true;
    }

    function handleAppcacheProgress(e) {
        if (acs.isDevMode()) {
            var progress = Math.round(100 * e.loaded / e.total);
            showProgress(progress);
        }
    }

    function handleAppcacheNoUpdate() {
        if (acs.isDevMode()) {
            showProgress(100);
        }
        if (acs.isOutdated) {
            acs.dumpCachesAndReload();
        }
    }

    function handleAppcacheCached() {
        showProgress(100);
        // workaround appcache wonkiness: when a user logs in that already has a populated appcache,
        // the browser's appcache update cycle finds a 404 on the manifest until the new sid is
        // established via various redirects. upon return to the app's url the old appcache is
        // still active (despite being marked obsolete) so fallback directives take effect. when the
        // new appcache is ready the page is refreshed so the non-fallback values are used.
        //
        // if the boot sequence is beyond bootstrap.js and fallback directives have been used then
        // reload the page to get the non-fallback values. must do only location.reload();
        // appcache.swapCache() nor hardRefresh() create the desired behavior.
        if (Aura["appBootstrapStatus"] === "failed" && Aura["appBootstrapCacheStatus"] === "failed" ) {
            location.reload();
        }
    }

    function handleAppcacheObsolete() {
        acs.appCache = false;
        acs.hardRefresh();
    }

    if (window.applicationCache && window.applicationCache.addEventListener) {
        window.applicationCache.addEventListener("checking", handleAppcacheChecking, false);
        window.applicationCache.addEventListener("downloading", handleAppcacheDownloading, false);
        window.applicationCache.addEventListener("updateready", handleAppcacheUpdateReady, false);
        window.applicationCache.addEventListener("error", handleAppcacheError, false);
        window.applicationCache.addEventListener("progress", handleAppcacheProgress, false);
        window.applicationCache.addEventListener("noupdate", handleAppcacheNoUpdate, false);
        window.applicationCache.addEventListener("cached", handleAppcacheCached, false);
        window.applicationCache.addEventListener("obsolete", handleAppcacheObsolete, false);
    }
};

/**
 * Marks the application as outdated.
 *
 * @memberOf AuraClientService
 * @export
 */
AuraClientService.prototype.setOutdated = function() {
    this.isOutdated = true;
    var appCache = window.applicationCache;
    if (!appCache || (appCache && (appCache.status === appCache.UNCACHED || appCache.status === appCache.OBSOLETE))) {
        this.dumpCachesAndReload();
    } else if (appCache.status === appCache.IDLE || appCache.status > appCache.DOWNLOADING) {
        // call update when there is a cache ie IDLE (status = 1) or cache is not being checked (status = 2)
        // or downloaded (status = 3) But have a care, as there are cases (e.g. chrome) where it claims you have
        // an appcache, but appcache.update() will fail (The only known way to reproduce is to use chrome dev
        // tools and disable caching.
        try {
            appCache.update();
        } catch (e) {
            //
            // whoops. something is inconsistent, but we don't really want to hard fail.
            // so, instead, try a different route.
            //
            this.dumpCachesAndReload();
        }
    }
};

/**
 * Inform Aura that the environment is either online or offline.
 *
 * @param {Boolean} isConnected Set to true to run Aura in online mode,
 * or false to run Aura in offline mode.
 * @memberOf AuraClientService
 * @export
 */
AuraClientService.prototype.setConnected = function(isConnected) {
    var isDisconnected = !isConnected;
    if (isDisconnected === this._isDisconnected) {
        // Already in desired state so no work to be done:
        return;
    }

    var e = $A.eventService.getNewEvent(isDisconnected ? "aura:connectionLost" : "aura:connectionResumed");
    if (e) {
        this._isDisconnected = isDisconnected;
        e.fire();
    } else {
        // looks like no definitions loaded yet
        alert(isDisconnected ? "Connection lost" : "Connection resumed");//eslint-disable-line no-alert
    }
};

/**
 * Saves the CSRF token to the Actions storage. Does not block nor report success or failure.
 *
 * This storage operate uses the adapter directly instead of AuraStorage because the specific
 * token key is used in mobile (hybrid) devices to obtain the token without the isolation and
 * even before Aura initialization.
 *
 * @returns {Promise} Promise that resolves with the current CSRF token value.
 */
AuraClientService.prototype.saveTokenToStorage = function() {
    // update the persisted CSRF token so it's accessible when the app is launched while offline.
    // fire-and-forget style, matching action response persistence.
    var storage = Action.getStorage();
    if (storage && storage.isPersistent() && this._token) {
        var token = this._token;

        // satisfy the adapter API shape requirements; see AuraStorage.setItems().
        var now = new Date().getTime();
        var tuple = [
             AuraClientService.TOKEN_KEY,
             {
                 "value": { "token": this._token },
                 "expires": now + 15768000000, // 1/2 year
                 "created": now
             },
             $A.util.estimateSize(AuraClientService.TOKEN_KEY) + $A.util.estimateSize(this._token)
         ];

        return storage.adapter.setItems([tuple]).then(
            function() { return token; },
            function(err) {
                $A.warning("AuraClientService.saveTokenToStorage(): failed to persist token: " + err);
                return token;
            }
        );
    }

    return Promise["resolve"](this._token);
};

/**
 * Loads the CSRF token from Actions storage.
 * @return {Promise} resolves or rejects based on data loading.
 */
AuraClientService.prototype.loadTokenFromStorage = function() {
    var storage = Action.getStorage();
    if (storage && storage.isPersistent()) {
        return storage.adapter.getItems([AuraClientService.TOKEN_KEY])
            .then(function(items) {
                if (items[AuraClientService.TOKEN_KEY]) {
                    return items[AuraClientService.TOKEN_KEY]["value"];
                }
                return undefined;
            });
    }
    return Promise["reject"](new Error("no Action storage"));
};

/**
 * Init host is used to set the host name for communications.
 *
 * It should only be called once during the application life cycle, since it
 * will be deleted in production mode.
 *
 * Note that in testing, this can be used to make the host appear unreachable.
 *
 * @param {string} host the host name of the server.
 * @export
 */
AuraClientService.prototype.initHost = function(host) {
    this._host = host || "";

    //#if {"modes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
    delete AuraClientService.prototype.initHost;
    delete AuraClientService.prototype["initHost"];
    //#end
};

/**
 * Initialize aura.
 *
 * FIXME: why is this exported
 *
 * This should never be called by client code.
 *
 * @param {Object} config the configuration for aura.
 * @param {string} token the XSS token.
 * @param {function} callback the callback when init is complete.
 * @param {object} container the place to install aura (defaults to document.body).
 * @export
 */
AuraClientService.prototype.init = function(config, token, container) {

    //
    // not on in dev modes to preserve stacktrace in debug tools
    // Why? - goliver
    // I think this should be done in all cases, the error can be more
    // instructive than an uncaught exception.
    //
    //#if {"modes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
    try {
        //#end

        if (token) {
            this._token = token;
        }

        var context=$A.getContext();

        // Load Tokens from Application Def
        var rootDef = $A.componentService.getComponentDef(config["componentDef"]);
        context.setTokens(rootDef.tokens);

        // Create Root (Application) Component
        var component = $A.componentService.createComponentPriv(config);

        context.setCurrentAccess(component);
        $A.renderingService.render(component, container || document.body);
        $A.renderingService.afterRender(component);
        context.releaseCurrentAccess();

        return component;

        // not on in dev modes to preserve stacktrace in debug tools
        //#if {"modes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
    } catch (e) {
        throw new $A.auraError("Error during init", e, $A.severity.QUIET);
    }
    //#end
};

/**
 * Return the number of inFlightXHRs
 *
 * @export
 */
AuraClientService.prototype.inFlightXHRs = function(excludeBackground) {
    if (excludeBackground) {
        var inFlight = $A.util.filter(this.allXHRs, function (xhr) {
            return this.availableXHRs.indexOf(xhr) === -1 && !xhr.background;
        }, this);

        return inFlight.length;
    }

    return this.allXHRs.length - this.availableXHRs.length;
};

/**
 * This function is used by the test service to determine if there are outstanding actions.
 *
 * @private
 */
AuraClientService.prototype.idle = function() {
    return (this.actionsQueued.length === 0 && this.actionsDeferred.length === 0
        && this.availableXHRs.length === this.allXHRs.length);
};

/**
 * Enqueues a function to run when no XHRs are in-flight.
 * @param {Function} f the function to execute.
 */
AuraClientService.prototype.runWhenXHRIdle = function(f) {
    // something in flight so enqueue
    this.xhrIdleQueue.push(f);

    if (this.inFlightXHRs() === 0) {
        this.processXHRIdleQueue();
        return;
    }
};

/**
 * Executes the queue of functions to run when no XHRs are in-flight.
 */
AuraClientService.prototype.processXHRIdleQueue = function() {
    $A.assert(this.inFlightXHRs() === 0, "Idle queue should only be processed when no XHRs are in flight");

    // optimization
    if (this.xhrIdleQueue.length === 0) {
        return;
    }

    // process the queue
    var queue = this.xhrIdleQueue;
    this.xhrIdleQueue = [];
    for (var i = 0 ; i < queue.length; i++) {
        try {
            queue[i]();
        } catch (e) {
            $A.log("AuraClientService.processXHRIdleQueue: error thrown by enqueued function", e);
        }
    }
};

/**
 * This function is used by the test service to determine if there are outstanding actions queued.
 *
 * @private
 */
AuraClientService.prototype.areActionsWaiting = function() {
    return !(this.actionsQueued.length === 0 && this.actionsDeferred.length === 0);
};

/**
 * Add privileged namespaces.
 *
 * @param {Array} a list of namespaces to mark privileged
 * @private
 */
AuraClientService.prototype.setNamespacePrivileges = function(sentNs) {
    var namespaces = { "internal" : this.namespaces.internal, "privileged" : this.namespaces.privileged };

    if (sentNs) {
        for (var x in namespaces) {
            if (sentNs[x]) {
                for (var i = 0; i < sentNs[x].length; i++) {
                    namespaces[x][sentNs[x][i]] = true;
                }
            }
        }
    }
};

/**
 * Initialize definitions.
 *
 * FIXME: why is this exported
 *
 * This should never be called by client code. It is exposed, but deleted after
 * first use.
 *
 * @param {Object} config the set of definitions to initialize
 * @export
 */

AuraClientService.prototype.initDefs = function() {
    if (!Aura["appJsReady"]) {
        Aura["appDefsReady"] = this.initDefs.bind(this);
        return;
    }

    var i, config = Aura["ApplicationDefs"];

    if (config) {
        var libraryDefs = config["libExporter"];
        for (i in libraryDefs) {
            $A.componentService.addLibraryExporter(i, libraryDefs[i]);
        }

        var cmpExporter = config["cmpExporter"];
        for (i in cmpExporter) {
            $A.componentService.addComponent(i, cmpExporter[i]);
        }

        $A.componentService.initEventDefs(config["eventDefs"]);
        $A.componentService.initLibraryDefs(config["libraryDefs"]);
        $A.componentService.initControllerDefs(config["controllerDefs"]);

        delete Aura["ApplicationDefs"];
    }

    this.finishedInitDefs = true;

    if (Aura["afterAppDefsReady"]) {
        Aura["afterAppDefsReady"].forEach(function (fn) { fn();});
    }
    delete Aura["afterAppDefsReady"];
};

AuraClientService.prototype.getAppBootstrap = function() {
    //  network &&  cache -> network
    //  network && !cache -> network
    // ?network && cache ->
    //   parallel -> cache
    //   serial   -> wait for network
    // ?network && !cache -> wait for network
    // !network &&  cache -> cache
    // !network && !cache -> perm failure

    if (Aura["appBootstrapStatus"] === "loaded") {
        // loaded bootstrap and CSRF from server so next load can use cached version if enabled
        this.clearDisableParallelBootstrapLoadOnNextLoad();
        return {source:"network", value:Aura["appBootstrap"]};
    }
    else if (Aura["appBootstrapCacheStatus"] === "loaded" && this.getParallelBootstrapLoad()) {
        return {source:"cache", value:Aura["appBootstrapCache"]};
    }
    else if (Aura["appBootstrapStatus"] === "failed" && Aura["appBootstrapCacheStatus"] === "loaded") {
        return {source:"cache", value:Aura["appBootstrapCache"]};
    }
    else if (Aura["appBootstrapStatus"] === "failed" && Aura["appBootstrapCacheStatus"] === "failed") {
        // if appcache has an error and bootstrap isn't available then we're stuck. we need
        // to hard refresh in order to allow for a server-side redirect or get a new manifest url
        if (this.appCacheError) {
            this.hardRefresh();
        }
        // if appcache is disabled or is idle then there's no recovery in place. other appcache states have
        // event handlers that recover automatically (typically by reload the page).
        else if (!window.applicationCache || window.applicationCache.status === window.applicationCache.UNCACHED || window.applicationCache.status === window.applicationCache.IDLE) {
            throw new $A.auraError("AuraClientService.getAppBootstrap: bootstrap.js failed to load from network or cache");
        }
    }

    return undefined;
};

AuraClientService.prototype.runAfterBootstrapReady = function (callback) {
    Aura["afterBootstrapReady"] = Aura["afterBootstrapReady"] || [];

    // if bootstrap is already processed
    if (this.appBootstrap) {
        callback.call(this, this.appBootstrap["data"]["app"]);
        return;
    }

    // if bootstrap isn't available then enqueue
    var bootstrap = this.getAppBootstrap();
    if (!bootstrap) {
        Aura["afterBootstrapReady"].push(this.runAfterBootstrapReady.bind(this, callback));
        return;
    }

    // bootstrap is available but unprocessed. process it!
    var context = $A.getContext();
    var boot = bootstrap.value;

    if (boot["error"]) {
        if (boot["error"]["exceptionEvent"]) {
            $A.util.json.resolveRefsObject(boot);
            this.throwExceptionEvent(boot["error"]);
            return;
        } else {
            throw new $A.auraError("Aura.loadComponent(): Failed to initialize application.\n" + boot["error"]["message"]);
        }
    }

    this._token = boot["token"];
    this.saveTokenToStorage(); // async fire-and-forget

    if (bootstrap.source === "network") {
        // must "clean" the network payload
        $A.util.json.resolveRefsObject(boot["data"]);
        $A.componentService.saveDefsToStorage(boot["context"], context);

        // persist bootstrap.js to storage
        var actionStorage = Action.getStorage();
        if (actionStorage && actionStorage.isPersistent()) {
            actionStorage.set(AuraClientService.BOOTSTRAP_KEY, boot)
                .then(
                    undefined, // noop
                    function(err) {
                        $A.warning("AuraClientService.runAfterBootstrapReady(): failed to persist bootstrap.js: " + err);
                    }
                );
        }
    }

    try {
        // can have a mismatch if we are upgrading framework or mode
        if (boot["data"]["components"]) {
            // need to use the resolvedRefs for AuraContext components (componentConfigs aka partialConfigs)
            boot["context"]["components"] = boot["data"]["components"];
        }
        context["merge"](boot["context"]);
    } catch(e) {
        if (bootstrap.source === "cache" && this.getParallelBootstrapLoad() && Aura["appBootstrapStatus"] !== "failed") {
            $A.warning("Bootstrap cache merge failed, waiting for bootstrap.js from network");
            Aura["afterBootstrapReady"].push(this.runAfterBootstrapReady.bind(this, callback));
            return;
        } else {
            throw new $A.auraError("AuraClientService.runAfterBootstrapReady: bootstrap from " + bootstrap.source + " failed to merge");
        }
    }

    $A.log("Bootstrap loaded and processed from " + bootstrap.source);
    this.appBootstrap = boot;

    if (bootstrap.source === "cache" && this.getParallelBootstrapLoad() && Aura["appBootstrapStatus"] !== "failed") {
        // in the future when network bootstrap arrives, if the load was successful
        // then perform the freshness check
        Aura["afterBootstrapReady"].push(function () {
            if (Aura["appBootstrapStatus"] === "loaded") {
                if (Aura["appBootstrap"]["error"]) {
                    $A.warning("AuraClientService.runAfterBootstrapReady(): bootstrap from network contained error: " + Aura["appBootstrap"]["error"]["message"]);
                } else {
                    Aura["bootstrapUpgrade"] = this.appBootstrap["md5"] !== Aura["appBootstrap"]["md5"];
                    this.checkBootstrapUpgrade();
                }
            }
            // release memory of network bootstrap
            delete Aura["appBootstrap"];
        }.bind(this));
    }

    // release memory
    delete Aura["appBootstrap"];
    delete Aura["appBootstrapCache"];

    callback.call(this, boot["data"]["app"]);
};

/**
 * Fire an aura:applicationRefreshed application level event if bootstrap returned from network differs from bootstrap
 * loaded from cache.
 * @private
 */
AuraClientService.prototype.checkBootstrapUpgrade = function() {
    // finishedInit and bootstrapUpgrade are set in async processes: former waits on libs_*.js
    // to arrive, latter waits on network bootstrap.js to arrive. thus global meeting point
    // pattern is required.
    if (Aura["bootstrapUpgrade"] === undefined) {
        // network version hasn't arrived yet
        return;
    }
    $A.log("Checking bootstrap signature: network returned " + (Aura["bootstrapUpgrade"] ? "new" : "same") + " version");
    if ($A["finishedInit"] && Aura["bootstrapUpgrade"]) {
        $A.eventService.getNewEvent("markup://aura:applicationRefreshed").fire();
    }
};

/**
 * Run a callback after defs are initialized.
 *
 * This is for internal use only. The function is called synchronously if definitions have
 * already been initialized.
 *
 * @param {function} callback the callback that should be invoked after defs are initialized
 * @private
 */
AuraClientService.prototype.runAfterInitDefs = function(callback) {
    if (this.finishedInitDefs) {
        return callback();
    }

    // Add to the list of callbacks waiting until initDefs() is done
    Aura["afterAppDefsReady"] = Aura["afterAppDefsReady"] || [];
    Aura["afterAppDefsReady"].push(callback);

};


/**
 * Run a callback after the application is ready (rendered)
 *
 * This is for internal use only. The function is called synchronously if definitions have
 * already been initialized.
 *
 * @param {function} callback the callback that should be invoked after defs are initialized
 * @private
 */
AuraClientService.prototype.runAfterAppReady = function(callback) {
    if ($A["finishedInit"]) {
        return callback();
    }

    // Add to the list of callbacks waiting until the app is ready (finishInit)
    Aura["afterAppReady"] = Aura["afterAppReady"] || [];
    Aura["afterAppReady"].push(callback);

};
/**
 * Loads bootstrap.js from storage, if it exists, and populates several
 * global variables consumed by runAfterBootstrapReady().
 * @return {Promise} a promise that always resolves. Errors are logged
 *  and the promise resolves.
 */
AuraClientService.prototype.loadBootstrapFromStorage = function() {
    // if bootstrap.js from network has loaded then skip loading from cache
    if (Aura["appBootstrap"]) {
        return Promise["resolve"]();
    }

    // if no storage then no cache hit
    var storage = Action.getStorage();
    if (!storage || !storage.isPersistent()) {
        Aura["appBootstrapCacheStatus"] = "failed";
        return Promise["resolve"]();
    }

    // else load from storage
    return storage.get(AuraClientService.BOOTSTRAP_KEY, true)
        .then(
            function(value) {
                if (value) {
                    Aura["appBootstrapCacheStatus"] = "loaded";
                    Aura["appBootstrapCache"] = value;
                } else {
                    Aura["appBootstrapCacheStatus"] = "failed";
                }
            },
            function(err) {
                Aura["appBootstrapCacheStatus"] = "failed";
                $A.warning("AuraClientService.loadBootstrapFromStorage(): failed to load bootstrap from storage: " + err);
                // do not rethrow
            }
        );
};

/**
 * Load a component.
 *
 * This function does a very complex dance to try to bring up the app as fast as possible. This is really
 * important in the case of persistent storage.
 *
 * @param {DefDescriptor} descriptor The key for a definition with a qualified name of the format prefix://namespace:name
 * @param {Object} attributes The configuration data to use. If specified, attributes are used as a key value pair.
 * @param {function} callback The callback function to run
 * @param {String} defType Sets the defType to "COMPONENT"
 *
 * @memberOf AuraClientService
 * @private
 */
AuraClientService.prototype.loadComponent = function(descriptor, attributes, callback /*,defType*/) {
    var acs = this;

    this.loadTokenFromStorage().then(
        function (value) {
            if (value && value["token"]) {
                acs._token = value["token"];
                $A.log("AuraClientService.loadComponent(): token found in storage");
            } else {
                $A.log("AuraClientService.loadComponent(): no token found in storage");
                // on next reload fetch bootstrap from network to get a new token. if
                // network load fails (eg due to offline) then fallback to cached version,
                // allowing the app to still boot.
                acs.disableParallelBootstrapLoadOnNextLoad();
            }
        },
        function(err) {
            $A.log("AuraClientService.loadComponent(): failed to load token from storage: " + err);
            // on next reload force server trip to get new token
            acs.disableParallelBootstrapLoadOnNextLoad();
        }
    );

    this.runAfterInitDefs(function () {
        Aura.bootstrapMark("runAfterInitDefsReady");

        acs.runAfterBootstrapReady(function (bootConfig) {
            Aura.bootstrapMark("runAfterBootstrapReady");

            $A.run(function() {
                callback(bootConfig);
            });
        });
    });
};

/**
 * Check to see if we are inside the aura processing 'loop'.
 *
 * @private
 */
AuraClientService.prototype.inAuraLoop = function() {
    return this.auraStack.length > 0;
};

/**
 * Push a new name on the stack.
 *
 * @param {string} name the name of the item to push.
 * @private
 */
AuraClientService.prototype.pushStack = function(name) {
    this.auraStack.push(name);
};

/**
 * Pop an item off the stack.
 *
 * The name of the item must match the previously pushed. If this is the last
 * item on the stack we do post processing, which involves sending actions to
 * the server.
 *
 * @param name the name of the last item pushed.
 * @private
 */
AuraClientService.prototype.popStack = function(name) {
    var lastName;

    if (this.auraStack.length > 0) {
        lastName = this.auraStack.pop();
        $A.assert(lastName === name, "Broken stack: popped "+lastName+" expected "+name+", stack = "+this.auraStack);
    } else {
        $A.warning("Pop from empty stack");
    }

    if (this.auraStack.length === 0) {
        this.auraStack.push("AuraClientService$popStack");
        this.postProcess();
    }
};

/*
 * @private
 */
AuraClientService.prototype.postProcess = function() {
    if (this.auraStack.length === 1 && this.auraStack[0] === "AuraClientService$popStack") {
        try {
            this.process();
        } catch (e) {
            throw (e instanceof $A.auraError) ? e : new $A.auraError("AuraClientService.postProcess: error in processing", e);
        }
        this.auraStack.pop();
    }
};

/**
 * Run the collection of actions.
 *
 * Entry point for processing actions. This creates a collector, and parcels out the action handling.
 * After this, server actions will be either getting values from storage, or will be executed, and the
 * client actions will all be queued up to be executed in order via setTimeout, giving server actions
 * entry points to collect.
 */
AuraClientService.prototype.process = function() {
    if (this.collector) {
        return;
    }
    this.collector = new Aura.Services.AuraClientService$AuraActionCollector();
    this.continueProcessing();
};

/**
 * continuation.
 *
 * Setp 2: walk actions setting up collections.
 *
 * We divide into client actions and server actions. Server actions are further
 * divided into stored vs. non-stored.
 */
AuraClientService.prototype.continueProcessing = function() {
    var i;
    var index = 0;
    var action;
    var actionList;

    // Protect against server actions collecting early.
    this.collector.actionsToCollect += 1;
    actionList = this.actionsQueued;
    this.actionsQueued = [];
    for (i = 0; i < actionList.length; i++) {
        action = actionList[i];
        try {
            if (action.abortIfComponentInvalid(true)) {
                // action already aborted.
                // this will only occur if the component is no longer valid.
                continue;
            }
            if (action.getDef().isServerAction()) {
                this.collector.actionsToCollect += 1;
                var storage = action.getStorage();
                this.collector.collected[index] = undefined;
                this.collector.collecting[index] = action;
                if (!action.isRefreshAction() && action.isStorable() && storage) {
                    this.collectStorableAction(action, index);
                } else {
                    this.collectServerAction(action, index);
                }
                index += 1;
            } else {
                this.collector.clientActions.push(action);
            }
        } catch (e) {
            var errorWrapper = new $A.auraError(null, e);
            errorWrapper.action = action;
            $A.logger.reportError(errorWrapper);
        }
    }

    this.processStorableActions();

    this.collector.actionsToCollect -= 1;
    // Start our index at 0
    this.collector.clientIndex = 0;
    if (this.optionClientSynchronous) {
        this.runClientActions();
    } else {
        this.continueClientActions();
    }
};

/**
 * Handle a single server action.
 */
AuraClientService.prototype.getStoredResult = function(action, storage, index) {
    //
    // For storable actions check the storage service to see if we already have a viable cached action
    // response we can complete immediately. In this case, we get a callback, so we create a callback
    // for each one (ugh, this could have been handled via passing an additional param to the action,
    // but we don't have that luxury now.)
    //
    var that = this;
    var key;

    key = action.getStorageKey();
    if (that.persistedActionFilter && !that.persistedActionFilter[key]) {
        // persisted action filter is active and action is not visible so go to server
        that.collectServerAction(action, index);
    } else {
        // using storage so callbacks *must* be in an aura loop
        storage.get(key, true).then(
            function(value) {
                if (value) {
                    that.executeStoredAction(action, value, that.collector.collected, index);
                    that.collector.actionsToCollect -= 1;
                    that.finishCollection();
                } else {
                    that.collectServerAction(action, index);
                }
            },
            function(/*error*/) {
                // error fetching from storage so go to the server
                that.collectServerAction(action, index);
            }
        );
    }
};

/**
 * Collect a storable action for subsequent bulk processing.
 * @param {Action} action The action to collect.
 * @param {Number} index The index of the array in the queue.
 */
AuraClientService.prototype.collectStorableAction = function(action, index) {
    this.collector.collectedStorableActions[index] = action;
};

/**
 * Bulk process the storable actions collected by AuraClientService#collectStorableAction.
 * - Action storage is bulk queried for cached action results.
 * - If a cached result is found for an action then the action is processed immediately. Otherwise
 *   the action is enqueued for the server.
 * - If an error occurs querying storage then all actions are sent to the server.
 */
AuraClientService.prototype.processStorableActions = function() {
    var arr, i, action;

    // if not storable actions then nothing to do
    if (this.collector.collectedStorableActions.length === 0) {
        return;
    }

    var collectedStorableActions = this.collector.collectedStorableActions;
    this.collector.collectedStorableActions = [];

    // if no storage then all actions go to the server
    var storage = Action.getStorage();
    if (!storage) {
        for (i = 0; i < collectedStorableActions.length; i++) {
            action = collectedStorableActions[i];
            if (!action) {
                this.collectServerAction(action, i);
            }
        }
        return;
    }

    // map of storage keys to array of action/index
    var keysToActions = {};

    var key;
    for (i = 0; i < collectedStorableActions.length; i++) {
        action = collectedStorableActions[i];
        if (action) {
            key = action.getStorageKey();
            arr = keysToActions[key];
            if (!arr) {
                arr = [];
                keysToActions[key] = arr;
            }
            arr.push({action:action, index:i});
        }
    }

    var that = this;
    storage.getAll(Object.keys(keysToActions), true)
        .then(
            function(items) {
                var value;
                for (var k in keysToActions) {
                    arr = keysToActions[k];
                    value = items[k];

                    for (i = 0; i < arr.length; i++) {
                        try {
                            if (value) {
                                that.executeStoredAction(arr[i].action, value, that.collector.collected, arr[i].index);
                                that.collector.actionsToCollect -= 1;
                            } else {
                                that.collectServerAction(arr[i].action, arr[i].index);
                            }
                        } catch (e) {
                            // don't let one action's failure impact the others
                            $A.logger.reportError(e);
                        }
                    }

                    that.finishCollection();
                }
            },
            function(/*error*/) {
                // error fetching from storage so all actions go to the server
                for (var k in keysToActions) {
                    arr = keysToActions[k];
                    for (i = 0; i < arr.length; i++) {
                        that.collectServerAction(arr[i].action, arr[i].index);
                    }
                }
            }
        )
        .then(
            undefined,
            function(error) {
                // something is really wrong. no clear way to recover so at least report
                $A.logger.reportError(error);
            }
        );
};

/**
 * Bulk persist storable actions to storage.
 * @param {Array} actions An array of storable actions to persist.
 */
AuraClientService.prototype.persistStorableActions = function(actions) {
    var action, key, value;
    var doStore = false;

    var values = {};
    for (var i = 0; i < actions.length; i++) {
        action = actions[i];
        value = action.getStored();
        if (value) {
            try {
                key = action.getStorageKey();
            } catch (e) {
                var errorWrapper = new $A.auraError(null, e);
                errorWrapper.action = action;
                $A.logger.reportError(errorWrapper);
            }

            doStore = true;
            values[key] = value;
            if (this.persistedActionFilter) {
                this.persistedActionFilter[key] = true;
            }
        }
    }

    var storage = Action.getStorage();
    if (doStore && storage) {
        storage.setAll(values)
            .then(
                undefined,
                function(error){
                    // storage problems should warn rather than the aggressive error.
                    var keys = Object.keys(values);
                    $A.warning("AuraClientService.persistStorableActions, problem storing "+keys.length+" actions:\n"+keys.join("\n")+"\n"+error);
                }
            );
    }

};

/**
 * Enqueue a stored action for execution after the XHR send.
 */
AuraClientService.prototype.enqueueStoredAction = function(action, response) {
    this.collector.actionsToComplete.push({ "action":action, "response":response});
};

/**
 * Execute a single stored action.
 *
 * This is done in situations when we get a result from the storage service. We also queue up a refresh
 * action if we are due a refresh or we have trouble running the action.
 */
AuraClientService.prototype.executeStoredAction = function(action, response, collected, index) {
    var refreshAction = null;

    this.setInCollection();
    try {
        if (!action.abortIfComponentInvalid(false)) {
            try {
                action.updateFromResponse(response);
                action.finishAction($A.getContext());
            } catch (e) {
                refreshAction = action.getRetryFromStorageAction();
                $A.warning("Finishing cached action failed. Trying to refetch from server: " + refreshAction.getStorageKey(), e);
                // Clear potential leftover configs
                $A.getContext().clearComponentConfigs(action.getId());
            }
            this.collector.actionsCompleted += 1;
            if (!refreshAction) {
                refreshAction = action.getRefreshAction(response);
            }
            if (refreshAction) {
                action.fireRefreshEvent("refreshBegin");
                collected[index] = refreshAction;
            }
        }
    } catch (e) {
        var errorWrapper = new $A.auraError(null, e);
        errorWrapper.action = action;
        $A.logger.reportError(errorWrapper);
    } finally {
        this.clearInCollection();
    }
};

/**
 * Collect a single action into our list.
 */
AuraClientService.prototype.collectServerAction = function(action, index) {
    this.collector.collected[index] = action;
    this.collector.actionsToCollect -= 1;
    this.finishCollection();
};

/**
 * Run client actions asynchronously.
 */
AuraClientService.prototype.continueClientActions = function() {
    var that = this;

    if (this.collector.clientIndex < this.collector.clientActions.length) {
        setTimeout(function() {
            that.setInCollection();
            that.executeClientAction(that.collector.clientActions[that.collector.clientIndex]);
            that.clearInCollection();
            that.collector.clientIndex += 1;
            that.continueClientActions();
        }, 0);
    } else {
        this.collector.clientActions = [];
        this.finishCollection();
    }
};

/**
 * Run client actions synchronously.
 */
AuraClientService.prototype.runClientActions = function() {
    var i;

    this.setInCollection();
    for (i = 0; i < this.collector.clientActions.length; i++) {
        this.executeClientAction(this.collector.clientActions[i]);
    }
    this.clearInCollection();
    this.collector.clientActions = [];
    this.finishCollection();
};

/**
 * Execute a client action.
 */
AuraClientService.prototype.executeClientAction = function(action) {
    try {
        if (!action.abortIfComponentInvalid(false)) {
            action.runDeprecated();
            action.finishAction($A.getContext());
        }
    } catch (ignore) {
        // already handled in the action.
    }
};

/**
 * Finish the collection process and send XHRs.
 */
AuraClientService.prototype.finishCollection = function() {
    if (!this.collector || this.collector.actionsToCollect !== 0 || this.collector.clientActions.length) {
        return;
    }
    if (this.collector.actionsCompleted) {
        this.fireDoneWaiting();
    }
    //
    // Carefully walk actions here, since we may have undefined actions in our collected set.
    // This way we filter them out, and don't try to process too many things. It also avoids
    // other problems processing the deferred queue.
    //
    var i = 0;
    var length;
    var collected = this.collector.collected;
    this.collector.collected = [];
    for (i = 0, length = collected.length; i < length; i++) {
        if (collected[i]) {
            this.actionsDeferred.push(collected[i]);
        }
    }
    if (this.actionsQueued.length) {
        this.continueProcessing();
        return;
    }
    if (this.actionsDeferred.length) {
        this.sendActionXHRs();
    }

    //
    // This will only be true if we opt for stored actions after send.
    //
    if (this.collector.actionsToComplete.length) {
        for (i = 0; i < this.collector.actionsToComplete.length; i++) {
            this.collector.collected.push(undefined);
        }
        this.continueCompletions();
    } else {
        this.finishProcessing();
    }
};

/**
 * @private
 */
AuraClientService.prototype.shouldSendOutForegroundActions = function( foregroundActions, cabooseCount ) {
    if(foregroundActions.length > cabooseCount ||
        (cabooseCount > 0 && Date.now() - this.lastSendTime > 60000) ) {
        return true;
    } else {
        return false;
    }
};

/**
 * Send actions.
 */
AuraClientService.prototype.sendActionXHRs = function() {
    var processing;
    var foreground = [];
    var background = [];
    var deferred = [];
    var action, auraXHR;
    var caboose = 0;
    var i;

    processing = this.actionsDeferred;
    this.actionsDeferred = [];
    for (i = 0; i < processing.length; i++) {
        action = processing[i];
        if (action.abortIfComponentInvalid(true)) {
            continue;
        }
        if (action.isDeferred()) {
            deferred.push(action);
        } else if (action.isBackground()) {
            background.push(action);
        } else {
            foreground.push(action);
            if (action.isCaboose()) {
                caboose += 1;
            }
        }
    }

    // either group caboose with at least one non-caboose foreground
    // or send all caboose after 60s since last send
    if( this.shouldSendOutForegroundActions(foreground, caboose) ) {
        auraXHR = this.getAvailableXHR(false);
        if (auraXHR) {
            if (!this.send(auraXHR, foreground, "POST")) {
                this.releaseXHR(auraXHR);
            }
        }
    }
    // If we don't have an XHR, that means we need to try to send later.
    if (!auraXHR) {
        this.actionsDeferred = this.actionsDeferred.concat(foreground);
    }

    if (background.length) {
        this.sendAsSingle(background, background.length);
    }

    if (deferred.length) {
        if (this.idle()) {
            this.sendAsSingle(deferred, 1);
        } else {
            this.actionsDeferred = this.actionsDeferred.concat(deferred);
        }
    }
};

/**
 * Send a group of actions as single action XHRs or re-enqueue them.
 *
 * All actions in the group will either be sent, marked as dupes, or put back in
 * the deferred queue.
 *
 * @private
 * @param {Array} actions the set of actions to send.
 * @param {int} count the number of actions to send.
 */
AuraClientService.prototype.sendAsSingle = function(actions, count) {
    var i;
    var sent = 0;
    var auraXHR;
    var action;

    for (i = 0; i < actions.length; i++) {
        action = actions[i];
        // We use 'deDupe' here with sending === false to ensure that we don't put an action
        // in the set of duplicate actions that does not get sent.
        if (this.deDupe(action, false)) {
            continue;
        }
        auraXHR = undefined;
        if (sent < count) {
            sent += 1;
            auraXHR = this.getAvailableXHR(true);
            if (auraXHR) {
                if (!this.send(auraXHR, [ action ], "POST", { background: true })) {
                    this.releaseXHR(auraXHR);
                }
            }
        }
        if (!auraXHR) {
            this.actionsDeferred.push(action);
        }
    }
};


/**
 * Continue with completions, running all action callbacks.
 *
 * This is used when the actions are stored, and we wish to run them after the XHRs
 * might have been sent.
 */
AuraClientService.prototype.continueCompletions = function() {
    var that = this;

    if (this.collector.completionIndex < this.collector.actionsToComplete.length) {
        setTimeout(function() {
            var collected = [ null ];
            var completion = that.collector.actionsToComplete[that.collector.completionIndex];
            that.executeStoredAction(completion["action"], completion["response"], collected, 0);
            that.collector.completionIndex += 1;
            if (collected[0]) {
                that.enqueueAction(collected[0]);
            }
            that.continueCompletions();
        }, 0);
    } else {
        if (this.actionsQueued.length) {
            this.continueProcessing();
        } else {
            this.finishProcessing();
        }
    }
};

/**
 * finish up processing, force a rerender.
 */
AuraClientService.prototype.finishProcessing = function() {
    this.setInCollection();
    try {
        $A.renderingService.rerenderDirty();
    } catch (e) {
        throw e;
    } finally {
        this.clearInCollection();
        if (this.actionsQueued.length > 0) {
            this.continueProcessing();
        } else {
            this.collector = undefined;
        }
    }
};

/**
 * Check, and then dedupe actions that are duplicates.
 *
 * @param {Action} action the action to dedupe.
 * @param {Boolean} sending true if we are sending and should create an entry.
 * @return true if the action has been deduped.
 */
AuraClientService.prototype.deDupe = function(action, sending) {
    var key, entry, dupes;

    if (!action.isStorable()) {
        return false;
    }
    try {
        key = action.getStorageKey();
    } catch (e) {
        return false;
    }
    entry = this.actionStoreMap[key];
    if (entry && !(entry.action.getState() === 'NEW' || entry.action.getState() === 'RUNNING')) {
        dupes = entry.dupes;
        $A.warning("Unfinished handling of action for key "+key);
        entry = undefined;
    }
    if (!entry) {
        //
        // If we are not sending the action now, just abort here, it was not a
        // dupe. This allows deDupe to be used on actions that are in a queue instead
        // of being sent.
        //
        if (!sending) {
            return false;
        }
        entry = {};
        entry.action = action;
        if (dupes) {
            entry.dupes = dupes;
        }
        this.actionStoreMap[key] = entry;
        this.actionStoreMap[action.getId()] = key;
        return false;
    } else if (entry.action !== action) {
        if (!entry.dupes) {
            entry.dupes = [ action ];
        } else {
            entry.dupes.push(action);
        }
        return true;
    }
    return false;
};

AuraClientService.prototype.getAndClearDupes = function(key) {
    if (!key || !this.actionStoreMap[key]) {
        return undefined;
    }
    var entry;
    var dupes;

    // we have a mapping.
    entry = this.actionStoreMap[key];
    dupes = entry.dupes;
    delete this.actionStoreMap[entry.action.getId()];
    delete this.actionStoreMap[key];
    return dupes;
};

/**
 * Send an xhr with a set of actions.
 *
 * The only note here is that if we fail to serialize the actions for any reason, we will log an
 * error and error out the actions. This is because we don't have a way of determining which of the
 * actions errored out.
 *
 * Used for instrumentation.
 *
 * @param auraXHR the wrapped XHR.
 * @param actions the set of actions to send.
 * @param method GET or POST
 * @param options extra options for the send, allows callers to set headers.
 * @return true if the XHR was sent, otherwise false.
 */
AuraClientService.prototype.send = function(auraXHR, actions, method, options) {
    var actionsToSend = [];
    var that = this;
    var action;
    var context = $A.getContext();
    var i;

    for (i = 0; i < actions.length; i++) {
        action = actions[i];
        if (!action.callAllAboardCallback(context)) {
            action.finishAction(context);
            continue;
        }
        if (this.deDupe(action, true)) {
            continue;
        }
        auraXHR.addAction(action);
        if (action.isChained()) {
            continue;
        }
        actionsToSend.push(action.prepareToSend());
    }

    if (actionsToSend.length === 0) {
        return false;
    }

    var processed = false;
    var timedOut = false;
    var timerId = undefined;
    var marker = Aura.Services.AuraClientServiceMarker++;
    var qs, url;

    try {
        var params = {
            "message"      : $A.util.json.encode({ "actions" : actionsToSend }),
            "aura.context" : context.encodeForServer(method === "POST")
        };
        if (method === "GET") {
            params["aura.access"] = "UNAUTHENTICATED";
        } else {
            params["aura.token"] = this._token;
        }
        qs = this.buildParams(params);
    } catch (e) {
        for (i = 0; i < actions.length; i++) {
            action = actions[i];
            action.markException(e);
            action.finishAction(context);
        }
    }

    url = this._host + "/aura?r=" + marker;

    //#if {"excludeModes" : ["PRODUCTION"]}
    url = this._host + "/aura?" + this.buildActionNameList(actionsToSend);
    //#end

    auraXHR.background = options && options.background;
    auraXHR.length = qs.length;
    auraXHR.request = this.createXHR();
    auraXHR.request["open"](method, url, this._appNotTearingDown);
    auraXHR.marker = marker;
    auraXHR.url = url;

    if (this._appNotTearingDown && "withCredentials" in auraXHR.request) {
        auraXHR.request["withCredentials"] = true;
    }

    //
    // Careful! On some browsers "onreadystatechange" is a write only property, so make
    // sure that we only write it. And for safety's sake, just write it once.
    //
    var onReady = function() {
        // Ordering is important. auraXHR will no longer be valid after processed.
        if (processed === false && (auraXHR.request["readyState"] === 4 || timedOut)) {
            processed = true;

            if (timerId !== undefined) {
                that.xhrClearTimeout(timerId);
            }

            that.receive(auraXHR, timedOut);
        }
    };

    if(context&&context.getCurrentAccess()&&this.inAuraLoop()){
        onReady = $A.getCallback(onReady);
    }

    auraXHR.request["onreadystatechange"] = onReady;

    if (options && options["headers"]) {
        var key, headers = options["headers"];

        for (key in headers) {
            if (headers.hasOwnProperty(key)) {
                auraXHR.request.setRequestHeader(key, headers[key]);
            }
        }
    }

    if (qs && method === "POST") {
        auraXHR.request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=ISO-8859-13');
        auraXHR.request["send"](qs);
    } else {
        auraXHR.request["send"]();
    }

    // start the timer if necessary
    if (this.xhrTimeout !== undefined) {
        timerId = this.xhrSetTimeout(function() {
            timedOut = true;
            timerId = undefined;
            onReady();
        });
    }

    // legacy code, spinner actually relies on the waiting event, need a proper fix
    setTimeout(function() {
        $A.eventService.getNewEvent("markup://aura:waiting").fire();
    }, 1);

    this.lastSendTime = Date.now();
    return true;
};

/**
 * Send beacon
 * @export
 */
AuraClientService.prototype.sendBeacon = function(action) {
    if (window.navigator && window.navigator["sendBeacon"] && window.Blob) {
        try {
            var params = {
                "message"      : $A.util.json.encode({ "actions" : [action] }),
                "aura.context" : $A.getContext().encodeForServer(true),
                "aura.token"   : this._token
            };
            var blobObj = new Blob([this.buildParams(params)], {
                "type" : "application/x-www-form-urlencoded; charset=ISO-8859-13"
            });
            window.navigator["sendBeacon"](this._host + "/auraAnalytics", blobObj);

        } catch (e) {
            $A.warning('Unable to parse action payload');
        }
    } else {
        $A.enqueueAction(action);
    }
};

/**
 * Sets a timeout for use by the XHR timeout mechanism. Hook for testing.
 * @private
 */
AuraClientService.prototype.xhrSetTimeout = function(f) {
    return setTimeout(f, this.xhrTimeout);
};

/**
 * Clears a timeout used by the XHR timeout mechanism. Hook for testing.
 * @private
 */
AuraClientService.prototype.xhrClearTimeout = function(id) {
    return clearTimeout(id);
};



/**
 * @returns {Object} An XHR based on what is available on the current browser.
 * @private
 */
AuraClientService.prototype.createXHR = function() {
    if (this.httpType) {
        if (this.httpType === 'generic') {
            return new XMLHttpRequest();
        } else if (this.httpType === 'msxml2') {
            return new ActiveXObject("Msxml2.XMLHTTP");
        } else {
            return new ActiveXObject("Microsoft.XMLHTTP");
        }
    }
    // UGLY!!!!
    if (window.ActiveXObject) {
        try {
            this.httpType = 'msxml2';
            return new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e) {
            this.httpType = 'msxml';
            // If this throws, we are out of ideas anyway, so just "let it throw, let it throw, let it throw".
            return new ActiveXObject("Microsoft.XMLHTTP");
        }
    } else {
        throw new $A.auraError("AuraClientService.createXHR: Unable to find an appropriate XHR");
    }
};

/**
 * Create an encoded string of parameters.
 *
 * @param {Map} map A map of parameter names and values
 * @returns {String} The encoded parameters
 * @private
 */
AuraClientService.prototype.buildParams = function(map) {
    var arr = [];
    var first = true;
    for (var key in map) {
        if (!first) {
            arr.push("&");
        }
        first = false;
        if ($A.util.isArray(map[key])) {
            var valueArray = map[key];
            if (valueArray.length === 0) {
                arr.push(key);
                arr.push("=");
            } else {
                for ( var i = 0; i < valueArray.length; i++) {
                    if (i > 0) {
                        arr.push("&");
                    }
                    arr.push(key);
                    arr.push("=");
                    arr.push(encodeURIComponent(valueArray[i]));
                }
            }
        } else {
            arr.push(key);
            arr.push("=");
            arr.push(encodeURIComponent(map[key]));
        }
    }
    return arr.join("");
};

/**
 * Create an encoded query string with action names and their occurrence count
 *
 * @param {Action[]} actions  The list of actions.
 * @returns {String}          The encoded query string.
 * @private
 */
AuraClientService.prototype.buildActionNameList = function(actions) {
    var map = {};

    for (var i = 0; i < actions.length; i++) {
        var actionDescriptor = actions[i]["descriptor"];
        var parts = actionDescriptor.split('/');
        var controllerMethod = parts.pop().split('$').pop();
        var controller = parts.pop().split('.').pop().split('Controller').shift();
        var actionName = controller + "." + controllerMethod;

        map[actionName] = map[actionName] ? map[actionName] + 1 : 1;
    }

    return this.buildParams(map);
};

/**
 * Callback for an XHR for a set of actions.
 *
 * This function does all of the processing for a set of actions that come back from the server. It correctly deals
 * with the case of interrupted communications, and handles aborts.
 *
 * @param {AuraXHR} auraXHR the xhr container.
 * @param {Boolean} timedOut true if the XHR timed out, false otherwise.
 * @private
 */
AuraClientService.prototype.receive = function(auraXHR, timedOut) {
    var responseMessage;
    this.auraStack.push("AuraClientService$receive");
    try {
        responseMessage = this.decode(auraXHR.request, false, timedOut);

        if (responseMessage["status"] === "SUCCESS") {
            this.processResponses(auraXHR, responseMessage["message"]);
        } else if (responseMessage["status"] === "INCOMPLETE") {
            this.processIncompletes(auraXHR);
        } else if (responseMessage["status"] === "ERROR") {
            this.processErrors(auraXHR, responseMessage["message"]);
        }
        this.fireDoneWaiting();
    } catch (e) {
        throw (e instanceof $A.auraError) ? e : new $A.auraError("AuraClientService.receive action callback failed", e);
    } finally {
        this.auraStack.pop();
        this.releaseXHR(auraXHR);
        this.process();
    }

    return responseMessage;
};

/**
 * Mark actions from an XHR response as being in the error state and set the error on the actions.
 *
 * @param {AuraXHR} auraXHR The xhr container.
 * @param {String} errorMessage The error message to associate with the actions.
 * @private
 */
AuraClientService.prototype.processErrors = function(auraXHR, errorMessage) {
    var action;
    var actions = auraXHR.actions;
    for (var id in actions) {
        if (actions.hasOwnProperty(id)) {
            action = actions[id];
            var error = new Error(errorMessage);
            $A.warning("Error in the server action response:" + errorMessage);
            action.markError($A.getContext(), [error]);
        }
    }
};

AuraClientService.prototype.processResponses = function(auraXHR, responseMessage) {

    var action, actionResponses, response, dupes;
    var token = responseMessage["token"];
    if (token) {
        this._token = token;
        this.saveTokenToStorage(); // async fire-and-forget
    }
    var context=$A.getContext();
    var priorAccess=context.getCurrentAccess();
    try {
        if(!priorAccess){
            context.setCurrentAccess($A.getRoot());
        }
        if ("context" in responseMessage) {
            var responseContext = responseMessage["context"];
            context['merge'](responseContext);
            $A.componentService.saveDefsToStorage(responseContext, context);
        }
    } catch (e) {
        $A.logger.reportError(e);
    }finally{
        if(!priorAccess){
            context.releaseCurrentAccess();
        }
    }

    // Look for any Client side event exceptions
    var events = responseMessage["events"];
    if (events) {
        for ( var en = 0, len = events.length; en < len; en++) {
            try {
                this.parseAndFireEvent(events[en]);
            } catch (e) {
                $A.logger.reportError(e);
            }
        }
    }

    actionResponses = responseMessage["actions"];

    var actionsToPersist = [];

    // Process each action and its response
    for ( var r = 0; r < actionResponses.length; r++) {
        action = null;
        try {
            response = actionResponses[r];
            action = auraXHR.getAction(response["id"]);
            if (action) {
                if (response["storable"] && !action.isStorable()) {
                    action.setStorable();
                }
            } else {
                // the client didn't request the action response but the server sent it so
                // a component is priming the actions cache. if the response isn't success
                // (which should never happen) then skip processing the action
                if (response["state"] !== "SUCCESS") {
                    continue;
                }

                action = this.buildStorableServerAction(response);
            }
            if (!action) {
                throw new $A.auraError("Unable to find an action for "+response["id"]+": "+response);
            } else {
                actionsToPersist.push(action);
                var key = this.actionStoreMap[action.getId()];
                dupes = this.getAndClearDupes(key);
                this.singleAction(action, response);
                if (dupes) {
                    for (var i = 0; i < dupes.length; i++) {
                        this.singleAction(dupes[i], response);
                    }
                }

            }
        } catch (e) {
            if (e instanceof $A.auraError) {
                throw e;
            } else {
                var errorWrapper = new $A.auraError("Error processing action response", e);
                errorWrapper.action = action;
                throw errorWrapper;
            }
        }
    }

    this.persistStorableActions(actionsToPersist);
};

AuraClientService.prototype.buildStorableServerAction = function(response) {
    var action = null;
    if (response["storable"]) {
        //
        // Hmm, we got a missing action. We allow this in the case that we have
        // a storable action from the server (i.e. we are faking an action from the
        // server to store data on the client. This is only used in priming, and is
        // more than a bit of a hack.
        //
        // Create a client side action instance to go with the server created action response
        //
        var descriptor = response["action"];
        var actionDef = $A.services.component.getActionDef(descriptor);
        if (!actionDef) {
            // No action.
            throw new $A.auraError("Missing action definition for "+descriptor);
        }
        action = actionDef.newInstance();
        action.setStorable();
        if (response["params"]) {
            action.setParams(response["params"]);
        }
        action.updateFromResponse(response);
    }
    return action;
};

AuraClientService.prototype.processIncompletes = function(auraXHR) {
    var actions = auraXHR.actions;
    var id, action, key, dupes;

    for (id in actions) {
        if (actions.hasOwnProperty(id)) {
            action = actions[id];
            action.incomplete($A.getContext());
            key = this.actionStoreMap[action.getId()];
            dupes = this.getAndClearDupes(key);
            if (dupes) {
                for (var i = 0; i < dupes.length; i++) {
                    dupes[i].incomplete($A.getContext());
                }
            }
        }
    }
};

/**
 * A utility to handle events passed back from the server.
 */
AuraClientService.prototype.parseAndFireEvent = function(evtObj) {
    var descriptor = evtObj["descriptor"];

    if (evtObj["eventDef"]) {
        // register the event with the EventDefRegistry
        $A.eventService.createEventDef(evtObj["eventDef"]);
    }

    if ($A.eventService.hasHandlers(descriptor)) {
        var evt = $A.getEvt(descriptor);
        if (evtObj["attributes"]) {
            evt.setParams(evtObj["attributes"]["values"]);
        }

        evt.fire();
    }
};

/**
 * Reset the token.
 *
 * Used by plugins.
 *
 * @param {Object}
 *            newToken Refresh the current token with a new one.
 * @memberOf AuraClientService
 * @export
 */
AuraClientService.prototype.resetToken = function(newToken) {
    this._token = newToken;
    this.saveTokenToStorage();
};

/**
 * [DEPRECATED] Run the actions.
 *
 * This function effectively attempts to submit all pending actions immediately (if
 * there is room in the outgoing request queue). If there is no way to immediately queue
 * the actions, they are submitted via the normal mechanism.
 *
 * @param {Array.<Action>}
 *            actions an array of Action objects
 * @param {Object}
 *            scope The scope in which the function is executed
 * @param {function}
 *            callback The callback function to run
 * @memberOf AuraClientService
 * @deprecated
 * @export
 */
AuraClientService.prototype.runActions = function(actions, scope, callback) {
    var i;
    var count = actions.length;
    var completion = function() {
        count -= 1;
        if (count === 0) {
            callback.call(scope);
        }
    };

    for (i = 0; i < actions.length; i++) {
        this.enqueueAction(actions[i]);
        actions[i].setCompletion(completion);
    }
    this.process();
};

/**
 * Inject a component and set up its event handlers. For Integration
 * Service.
 *
 * FIXME: this should be private.
 *
 * @param {Object} rawConfig the config for the component to be injected
 * @param {String} locatorDomId the DOM id where we should place our element.
 * @param {String} localId the local id for the component to be created.
 * @memberOf AuraClientService
 * @export
 */
AuraClientService.prototype.injectComponent = function(rawConfig, locatorDomId, localId) {
    var config = $A.util.json.resolveRefsObject(rawConfig);

    // Save off any context global stuff like new labels
    var context = $A.getContext();
    context['merge'](config["context"]);
    var priorAccess = context.getCurrentAccess();

    var actionResult = config["actions"][0];
    var action = $A.get("c.aura://ComponentController.getComponent");
    var self = this;

    action.setCallback(action, function(a) {
        try {
            var root = $A.getRoot();

            if(!priorAccess){
                context.setCurrentAccess(root);
            }

            var element = $A.util.getElement(locatorDomId);

            // Check for bogus locatorDomId
            var errors;
            if (!element) {
                // We have no other place to display this
                // critical failure - fallback to the
                // document.body
                element = document.body;
                errors = [
                        "Invalid locatorDomId specified - no element found in the DOM with id=" + locatorDomId
                ];
            } else {
                errors = a.getState() === "SUCCESS" ? undefined : action.getError();
            }

            var componentConfig;
            if (!errors) {
                componentConfig = a.getReturnValue();
            } else {
                //
                // Make sure we clear any configs associated with the action.
                //
                $A.getContext().clearComponentConfigs(a.getId());
                //
                // Display the errors in a ui:message instead
                //
                componentConfig = self.createIntegrationErrorConfig(errors);
            }

            $A.util.apply(componentConfig, {
                "localId" : localId,
                "attributes" : {
                    "valueProvider" : root
                }
            }, null, true);

            var c = $A.componentService.createComponentPriv(componentConfig);

            if (!errors) {
                // Wire up event handlers
                self.addComponentHandlers(c, config["actionEventHandlers"]);
            }

            var body = root.get("v.body");
            body.push(c);

            // Do not let Aura consider this initial setting into the surrogate app as a candiadate for rerendering
            root.set("v.body", body, true);

            $A.render(c, element);

            $A.afterRender(c);
        } finally {
            if (!priorAccess) {
                context.releaseCurrentAccess();
            }
        }
    });

    action.updateFromResponse(actionResult);
    action.finishAction($A.getContext());
};

/**
 * Create error component config to display integration service errors
 *
 * @param {(String|String[])} errorText
 * @returns {Object} error config for ui:message
 */
AuraClientService.prototype.createIntegrationErrorConfig = function(errorText) {
    return {
        "componentDef" : {
            "descriptor" : "markup://ui:message"
        },

        "attributes" : {
            "valueProvider": $A.getRoot(),
            "values" : {
                "title" : "Aura Integration Service Error",
                "severity" : "error",
                "body" : [
                    {
                        "componentDef" : {
                            "descriptor" : "markup://ui:outputText"
                        },

                        "attributes" : {
                            "values" : {
                                "value" : $A.util.json.encode(errorText)
                            }
                        }
                    }
                ]
            }
        }
    };
};

/**
 * Used within async callback for AIS.
 *
 * @param {Component} component - component
 * @param {String} locator - parent element or the id of the parent element where to inject component
 * @param {Object} [actionEventHandlers] - event handlers
 */
AuraClientService.prototype.renderInjection = function(component, locator, actionEventHandlers) {
    var error = null;

    var stringLocator = $A.util.isString(locator);
    var hostEl = stringLocator ? document.getElementById(locator) : locator;

    if (!hostEl) {
        error = "Invalid locator specified - " + (stringLocator ? "no element found in the DOM with id=" + locator : "locator element not provided");
        hostEl = document.body;
    }

    if (component.isInstanceOf("aura:text")) {
        // check for component creation error
        error = component.get("v.value");
    }

    if (error) {
        // create same messaging as injectComponent
        var errorConfig = this.createIntegrationErrorConfig(error);
        errorConfig["localId"] = component.getLocalId();
        component = $A.componentService.createComponentPriv(errorConfig);
    }

    this.addComponentHandlers(component, actionEventHandlers);
    $A.render(component, hostEl);
    $A.afterRender(component);
};

/**
 * Use async created component for integration service
 *
 * @param {Object} config - component def config
 * @param {String} locator - parent element or the id of the parent element where to inject component
 * @param {Object} [eventHandlers] - handlers of registered event
 * @param {Function} callback The callback to use once the component is successfully created
 * @export
 */
AuraClientService.prototype.injectComponentAsync = function(config, locator, eventHandlers, callback) {
    var acs = this;
    var context = $A.getContext();
    var priorAccess = context.getCurrentAccess();
    var root = $A.getRoot();
    if (!priorAccess) {
        context.setCurrentAccess(root);
    }

    $A.componentService.newComponentAsync(undefined, function(component) {
        if (callback) {
            callback(component);
        }

        acs.renderInjection(component, locator, eventHandlers);

        if (!priorAccess) {
            context.releaseCurrentAccess();
        }
    }, config, root, false, false, true);

    // Now we go ahead and stick a label load on the request.
    var labelAction = $A.get("c.aura://ComponentController.loadLabels");
    labelAction.setCallback(this, function() {});
    acs.enqueueAction(labelAction);
};

/**
 * Add handlers of registered events for AIS
 *
 * @param {Component} component - component
 * @param {Object} [actionEventHandlers] - handlers of registered events
 */
AuraClientService.prototype.addComponentHandlers = function(component, actionEventHandlers) {
    if (actionEventHandlers) {
        var containerValueProvider = {
            get : function(functionName) {
                return {
                    run : function(event) {
                        window[functionName](event);
                    },
                    runDeprecated : function(event) {
                        window[functionName](event);
                    }
                };
            }
        };

        for (var evt in actionEventHandlers) {
            component.addHandler(evt, containerValueProvider, actionEventHandlers[evt]);
        }
    }
};

/**
 * Return whether Aura believes it is online.
 * Immediate and future communication with the server may fail.
 * @memberOf AuraClientService
 * @return {Boolean} Returns true if Aura believes it is online; false otherwise.
 * @export
 */
AuraClientService.prototype.isConnected = function() {
    return !this._isDisconnected;
};

/**
 * This function must be called from within an event loop.
 *
 * @param {Action} action the action to enqueue
 * @param {Boolean} background Set to true to run the action in the background, otherwise the value of action.isBackground() is used.
 * @export
 * @public
 * @platform
 */
AuraClientService.prototype.enqueueAction = function(action, background) {

    $A.assert(!$A.util.isUndefinedOrNull(action), "EnqueueAction() cannot be called on an undefined or null action.");
    $A.assert($A.util.isAction(action), "Cannot call EnqueueAction() with a non Action parameter.");

    if (background) {
        $A.warning("Do not use the deprecated background parameter");
    }
    this.actionsQueued.push(action);
};

/**
 * [DEPRECATED] [DOES NOT WORK] [DO NOT USE] Defer the action by returning a Promise object.
 * Configure your action excluding the callback prior to deferring.
 * The Promise is a thenable, meaning it exposes a 'then' function for consumers to chain updates.
 *
 * @param {Action} action - target action
 * @return {Promise} a promise which is resolved or rejected depending on the state of the action
 * @export
 */
AuraClientService.prototype.deferAction = function (action) {
    $A.warning("$A.deferAction is broken, do not use it!");
    var acs = this;
    var promise = new Promise(function(success, error) {

        action.wrapCallback(acs, function (a) {
            if (a.getState() === 'SUCCESS') {
                success(a.getReturnValue());
            }
            else {
                // Reject the promise as it was not successful.
                // Give the user a somewhat useful object to use on reject.
                error({ state: a.getState(), action: a });
            }
        });

        acs.enqueueAction(action);
    });

    return promise;
};

/**
 * Determines whether an action is stored.
 *
 * @param {String} descriptor - action descriptor.
 * @param {Object} params - map of keys to parameter values.
 * @param {Function} callback - called asynchronously after the action was looked up in the cache. Fired with a
 * single parameter, isInStorge {Boolean} - representing whether the action was found in the cache.
 * @export
 */
AuraClientService.prototype.isActionInStorage = function(descriptor, params, callback) {
    var storage = Action.getStorage();
    callback = callback || this.NOOP;

    if (!$A.util.isString(descriptor) || !$A.util.isObject(params) || !storage) {
        callback(false);
        return;
    }

    var key = Action.getStorageKey(descriptor, params);
    if (this.persistedActionFilter && !this.persistedActionFilter[key]) {
        // persisted action filter is active and action is not visible
        callback(false);
        return;
    }

    storage.get(key).then(
        function(value) {
            $A.run(function() {
                callback(!!value);
            });
        },
        function(err) {
            // storage.get() errored so assume repeating the request will also fail
            $A.warning("AuraClientService.isActionInStorage(): storage.get() threw " + err);
            callback(false);
        }
    );
};

/**
 * Resets the cache cleanup timer for an action.
 *
 * @param {String} descriptor - action descriptor.
 * @param {Object} params - map of keys to parameter values.
 * @param {Function} callback - called asynchronously after the action was revalidated. Called with a single
 * parameter, wasRevalidated {Boolean} - representing whether the action was found in the cache and
 * successfully revalidated.
 * @export
 */
AuraClientService.prototype.revalidateAction = function(descriptor, params, callback) {
    var storage = Action.getStorage();
    callback = callback || this.NOOP;

    if (!$A.util.isString(descriptor) || !$A.util.isObject(params) || !storage) {
        callback(false);
        return;
    }

    var key = Action.getStorageKey(descriptor, params);
    if (this.persistedActionFilter && !this.persistedActionFilter[key]) {
        // persisted action filter is active and action is not visible
        callback(false);
        return;
    }

    storage.get(key, true).then(
        function(value) {
            if (value) {
                storage.set(key, value).then(
                    function() { callback(true); },
                    function(/*error*/) { callback(false); }
                );
            } else {
                callback(false);
            }
        },
        function(err) {
            $A.warning("AuraClientService.revalidateAction(): storage.get() threw " + err);
            callback(false);
        }
    );
};

/**
 * Clears an action out of the action cache.
 *
 * @param {String} descriptor action descriptor.
 * @param {Object} params map of keys to parameter values.
 * @param {Function} successCallback called after the action was invalidated. Called with true if the action was
 * successfully invalidated and false if the action was invalid or was not found in the cache.
 * @param {Function} errorCallback called if an error occurred during execution
 * @export
 */
AuraClientService.prototype.invalidateAction = function(descriptor, params, successCallback, errorCallback) {
    var storage = Action.getStorage();
    successCallback = successCallback || this.NOOP;
    errorCallback = errorCallback || this.NOOP;

    if (!$A.util.isString(descriptor) || !$A.util.isObject(params) || !storage) {
        successCallback(false);
        return;
    }

    var key = Action.getStorageKey(descriptor, params);
    if (this.persistedActionFilter && !this.persistedActionFilter[key]) {
        // persisted action filter is active and action is not visible
        successCallback(true);
        return;
    }

    storage.remove(key).then(
        function() { successCallback(true); },
        errorCallback
    );
};

AuraClientService.prototype.isInternalNamespace = function(namespace) {
    return this.namespaces.internal.hasOwnProperty(namespace);
};

AuraClientService.prototype.isPrivilegedNamespace = function(namespace) {
    return this.namespaces.privileged.hasOwnProperty(namespace);
};

AuraClientService.prototype.allowAccess = function(definition, component) {
    if(definition&&definition.getDescriptor){
        var context;
        var currentAccess;
        if(definition.access==='G'){
            // GLOBAL means accessible from anywhere
            return true;
        }else if(definition.access==='p'){
            // PRIVATE means "same component only".
            context=$A.getContext();
            currentAccess=context&&context.getCurrentAccess();
            return currentAccess&&(currentAccess===component||currentAccess.getComponentValueProvider()===component||currentAccess.getDef()===component);
        }else{
            // Compute PRIVILEGED, INTERNAL, PUBLIC, and default (omitted)
            context=$A.getContext();
            currentAccess=(context&&context.getCurrentAccess())||component;
            if(currentAccess){
                var accessDef=null;
                var accessFacetDef=null;
                if(currentAccess.getComponentValueProvider&&currentAccess.getDef){
                    var accessFacetValueProvider = currentAccess.getComponentValueProvider();
                    accessFacetDef=accessFacetValueProvider&&accessFacetValueProvider.getDef();
                    accessDef=currentAccess.getDef();
                }else{
                    accessDef=currentAccess;
                }

                var accessDescriptor=accessDef&&accessDef.getDescriptor();
                var accessFacetDescriptor=accessFacetDef&&accessFacetDef.getDescriptor();
                var accessNamespace=accessDescriptor&&accessDescriptor.getNamespace();
                var accessFacetNamespace=accessFacetDescriptor&&accessFacetDescriptor.getNamespace();

                var allowProtocol=this.protocols.hasOwnProperty(accessDescriptor&&accessDescriptor.getPrefix()) || this.protocols.hasOwnProperty(accessFacetDescriptor&&accessFacetDescriptor.getPrefix());
                var isInternal=allowProtocol || this.namespaces.internal.hasOwnProperty(accessNamespace) || this.namespaces.internal.hasOwnProperty(accessFacetNamespace);
                var isPrivileged=this.namespaces.privileged.hasOwnProperty(accessNamespace) || this.namespaces.privileged.hasOwnProperty(accessFacetNamespace);

                if(definition.access==='PP') {
                    // PRIVILEGED means accessible to namespaces marked PRIVILEGED, as well as to INTERNAL
                    if(isPrivileged || isInternal){
                        // Privileged Namespace
                        return true;
                    }
                }

                var effectiveAccess=definition.access||(isInternal?'I':'P');
                if(effectiveAccess==='P') {
                    // PUBLIC means "same namespace only"
                    var targetNamespace = definition.getDescriptor().getNamespace();
                    if (currentAccess === component || accessNamespace === targetNamespace || accessFacetNamespace === targetNamespace) {
                        return true;
                    }
                }

                if(effectiveAccess==="I"){
                    // Internal Namespace
                    return isInternal;
                }

                // INTERNAL / DEFAULT means namespaces marked INTERNAL by the host
                if(effectiveAccess==="I"||effectiveAccess==="PP"){
                    // Internal Namespace
                    return isInternal || isPrivileged;
                }

            }
            // JBUCH: HACK: THIS DELIGHTFUL BLOCK IS BECAUSE OF LEGACY UNAUTHENTICATED/AUTHENTICATED ABUSE OF ACCESS ATTRIBUTE. COOL.
            return (definition.isInstanceOf && definition.isInstanceOf("aura:application")) ||
            // #if {"excludeModes" : ["PRODUCTION","PRODUCTIONDEBUG"]}
            // This check allows components to be loaded directly in the browser in DEV/TEST
            (!$A.getRoot() || !$A.getRoot().isInstanceOf('aura:application')) && !(context&&context.getCurrentAccess()) ||
            // #end
            false;
        }
    }
    return false;
};

/**
 * Handles invalidSession exception from the server when the CSRF token is invalid.
 * Saves the new token to storage then refreshes page.
 * @export
 */
AuraClientService.prototype.invalidSession = function(token) {
    var acs = this;

    function refresh(disableParallelBootstrapLoad) {
        if (disableParallelBootstrapLoad) {
            acs.disableParallelBootstrapLoadOnNextLoad();
        }
        $A.clientService.hardRefresh();
    }

    // if new token provided then persist to storage and reload. if persisting
    // fails then we must go to the server for bootstrap.js to get a new token.
    if (token && token["newToken"]) {
        this._token = token["newToken"];
        this.saveTokenToStorage()
            .then(refresh.bind(null, false), refresh.bind(null, true))
            .then(undefined, function(err) {
                $A.warning("AuraClientService.invalidSession(): Failed to refresh, " + err);
            });
    } else {
        // refresh (to get a new session id) and force bootstrap.js to the server
        // (to get a new csrf token).
        refresh(true);
    }
};

/**
 * Sets how Aura loads bootstrap.js: in parallel from network and cache,
 * or serially from network then cache. This must be called from a template's
 * auraPreInitBlock. By default this is enabled.
 * @param {Boolean} parallel if true parallelly load bootstrap.js from
 *  network and cache. If false load from network first (if it fails then
 *  load from cache).
 * @export
 */
AuraClientService.prototype.setParallelBootstrapLoad = function(parallel) {
    this._parallelBootstrapLoad = !!parallel;
};

/**
 * On next load, serially load bootstrap.js from network then cache.
 *
 * If a valid CSRF token is not available then on next load bootstrap.js must
 * go to the server to fetch a new and valid CSRF token.
 * @private
 */
AuraClientService.prototype.disableParallelBootstrapLoadOnNextLoad = function() {
    // can only get a cache hit on bootstrap.js with persistent storage
    var storage = Action.getStorage();
    if (storage && storage.isPersistent()) {
        var expire = new Date(new Date().getTime() + 1000*60*60*24*7); // + 1 week
        document.cookie = this._disableBootstrapCacheCookie + '=true; expires=' + expire.toUTCString();
    }
};

/**
 * Clears disabling parallel load of bootstrap.js. See disableParallelBootstrapLoadOnNextLoad.
 * @private
 */
AuraClientService.prototype.clearDisableParallelBootstrapLoadOnNextLoad = function() {
    document.cookie = this._disableBootstrapCacheCookie + '=true; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

/**
 * Gets whether to check action cache for bootstrap.js.
 * @return {Boolean} true if the cache should be checked; false to skip the cache.
 */
AuraClientService.prototype.getParallelBootstrapLoad = function() {
    if (!this._parallelBootstrapLoad) {
        return false;
    }

    // check for cookie indicating disablement
    var cookies = '; ' + document.cookie;
    var key = '; ' + this._disableBootstrapCacheCookie + '=';
    var begin = cookies.indexOf(key);
    if (begin === -1) {
        return true;
    }
    var end = cookies.indexOf(';', begin + key.length);
    var value = cookies.substring(begin + key.length, end);
    // stored value is string true; see disableParallelBootstrapLoadOnNextLoad()
    return value !== 'true';
};

/**
 * This is a temporary API to workaround a broken network stack found on Samsung
 * Galaxy S5/S6 devices on Android 5.x.
 *
 * Sets the timeout for all Aura-initiated XHRs.
 *
 * The timeout applies to each XHR. The timer starts when XHR.send() is invoked
 * and ends when XHR.onreadystatechange (readyState = 4) is fired. If the timeout
 * expires before XHR.onreadystatechange then the actions in the XHR are moved to
 * INCOMPLETE state.
 *
 * @param {Number} timeout The XHR timeout in milliseconds.
 * @memberOf AuraClientService
 * @export
 */
AuraClientService.prototype.setXHRTimeout = function(timeout) {
    $A.assert($A.util.isFiniteNumber(timeout) && timeout > 0, "Timeout must be a positive number");
    this.xhrTimeout = timeout;
};

/**
 * Populates the persisted actions filter if applicable.
 * @return {Promise} a promise that resolves when the action keys are loaded.
 */
AuraClientService.prototype.populatePersistedActionsFilter = function() {
    this.setupPersistedActionsFilter();

    // if filter isn't active then noop
    if (!this.persistedActionFilter) {
        return Promise["resolve"]();
    }

    // if GVP didn't load then don't populate the filter, effectively hiding all persisted actions
    var context = $A.getContext();
    if (!context.globalValueProviders.LOADED_FROM_PERSISTENT_STORAGE) {
        return Promise["resolve"]();
    }

    // if actions isn't persistent then nothing to do
    var actionStorage = Action.getStorage();
    if (!actionStorage || !actionStorage.isPersistent()) {
        return Promise["resolve"]();
    }

    var acs = this;
    return actionStorage.getAll([], true)
        .then(function(items) {
            for (var key in items) {
                acs.persistedActionFilter[key] = true;
            }
            $A.log("AuraClientService: restored " + Object.keys(items).length + " actions");
        });
};

/**
 * Setup the persisted actions filter.
 *
 * Actions can depend on defs. And defs can depend on GVPs (particularly $Label).
 * Defs are loaded at framework init so the available actions must be determined
 * at the same time: framework init. Otherwise in a multi-tab scenario actions from
 * other tabs may be visible, and those actions may reference defs this tab doesn't have.
 */
AuraClientService.prototype.setupPersistedActionsFilter = function() {
    // single execution guard
    if (this.persistedActionFilter !== undefined) {
        return;
    }

    this.persistedActionFilter = null;

    // if actions isn't persistent then nothing to do
    var actionStorage = Action.getStorage();
    if (!actionStorage || !actionStorage.isPersistent()) {
        return;
    }

    // enable actions filter
    this.persistedActionFilter = {};
};


Aura.Services.AuraClientService = AuraClientService;
