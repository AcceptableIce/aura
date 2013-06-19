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
 * @namespace The Aura Client Service, accessible using $A.services.client.
 *            Communicates with the Aura Server.
 * @constructor
 */
var AuraClientService = function() {
    // #include aura.AuraClientService_private
    // #include aura.controller.ActionQueue

    var clientService = {

        /** @private */
        initHost : function(host) {
            priv.host = host || "";
            //#if {"modes" : ["PRODUCTION"]}
            delete this.initHost;
            //#end
        },

        /** @private */
        init : function(config, token, callback, container) {
            $A.mark("Initial Component Created");
            $A.mark("Initial Component Rendered");
            var body = document.body;
            //#if {"modes" : ["PRODUCTION"]}
            try {
                //#end
                if (token) {
                    priv.token = token;
                }

                // Why is this happening in the ClientService? --JT
                var component = componentService.newComponentDeprecated(config, null, false, true);

                $A.endMark("Initial Component Created");

                renderingService.render(component, container || body);
                renderingService.afterRender(component);

                $A.endMark("Initial Component Rendered");
                callback(component);

                // not on in dev modes to preserve stacktrace in debug tools
                //#if {"modes" : ["PRODUCTION"]}
            } catch (e) {
                $A.error(e);
                throw e;
            }
            //#end
            delete this.init;
        },

        /** @private */
        initDefs : function(config) {
            var evtConfigs = aura.util.json.resolveRefs(config["eventDefs"]);
            $A.mark("Registered Events [" + evtConfigs.length + "]");
            for ( var j = 0; j < evtConfigs.length; j++) {
                eventService.getEventDef(evtConfigs[j]);
            }
            $A.endMark("Registered Events [" + evtConfigs.length + "]");

            var controllerConfigs = aura.util.json.resolveRefs(config["controllerDefs"]);
            $A.mark("Registered Controllers [" + controllerConfigs.length + "]");
            for (j = 0; j < controllerConfigs.length; j++) {
                componentService.getControllerDef(controllerConfigs[j]);
            }
            $A.endMark("Registered Controllers [" + controllerConfigs.length + "]");

            var comConfigs = aura.util.json.resolveRefs(config["componentDefs"]);
            $A.mark("Registered Components [" + comConfigs.length + "]");
            for ( var i = 0; i < comConfigs.length; i++) {
                componentService.getDef(comConfigs[i]);
            }
            $A.endMark("Registered Components [" + comConfigs.length + "]");

            $A.measure("Initial Scripts Finished", "PageStart");

            // Let any interested parties know that defs have been initialized
            for ( var n = 0; n < priv.initDefsObservers.length; n++) {
                priv.initDefsObservers[n]();
            }

            priv.initDefsObservers = [];

            // Use the non-existence of initDefs() as the sentinel indicating that defs are good to go
            delete this.initDefs;
        },

        /** @private */
        runAfterInitDefs : function(callback) {
            if (this.initDefs) {
                // Add to the list of callbacks waiting until initDefs() is done
                priv.initDefsObservers.push(callback);
            } else {
                // initDefs() is done and gone so just run the callback
                callback();
            }
        },

        /**
         * Load an app by calling loadComponent.
         *
         * @param {DefDescriptor}
         *            descriptor The key for a definition with a qualified name
         *            of the format prefix://namespace:name.
         * @param {Map}
         *            attributes The configuration data to use in the app
         * @param {function}
         *            callback The callback function to run
         * @memberOf AuraClientService
         * @private
         */
        loadApplication : function(descriptor, attributes, callback) {
            this.loadComponent(descriptor, attributes, callback, "APPLICATION");
        },

        /**
         * Throw an exception.
         *
         * @param {Object}
         *            config The data for the exception event
         * @memberOf AuraClientService
         * @private
         */
        throwExceptionEvent : function(config) {
            priv.thowExceptionEvent(config);
        },

        /**
         * Load a component.
         *
         * @param {DefDescriptor}
         *            descriptor The key for a definition with a qualified name
         *            of the format prefix://namespace:name
         * @param {Map}
         *            attributes The configuration data to use. If specified,
         *            attributes are used as a key value pair.
         * @param {function}
         *            callback The callback function to run
         * @param {String}
         *            defType Sets the defType to "COMPONENT"
         * @memberOf AuraClientService
         * @private
         */
        loadComponent : function(descriptor, attributes, callback, defType) {
            this.runAfterInitDefs(function() {
                var desc = new DefDescriptor(descriptor);
                var tag = desc.getNamespace() + ":" + desc.getName();

                var method = defType === "APPLICATION" ? "getApplication" : "getComponent";
                var action = $A.get("c.aura://ComponentController." + method);

                action.setStorable({
                	"ignoreExisting" : true
            	});

                action.setParams({
                    name : tag,
                    attributes : attributes
                });

                action.setCallback(this, function(a) {
                	var state = a.getState();
                    if (state === "SUCCESS") {
                        callback(a.getReturnValue());
                    } else if (state === "INCOMPLETE"){
                    	// Use a stored response if one exists
                        var storage = Action.prototype.getStorage();
                        if (storage) {
                            var key = action.getStorageKey();
                            storage.get(key, function(actionResponse) {
                            	if (actionResponse) {
                                    storage.log("AuraClientService.loadComponent(): bootstrap request was INCOMPLETE using stored action response.", [action, actionResponse]);

                            		action.complete(actionResponse);
                            	} else {
                                    $A.error("Unable to load application.");
                            	}
                            });
                        }
                    } else {
                        $A.error(a.getError()[0].message);
                    }

                    $A.measure("Completed Component Callback", "Sending XHR " + $A.getContext().getNum());
                });

                clientService.pushStack("loadComponent");
                clientService.enqueueAction(action);
                clientService.popStack("loadComponent");
            });
        },

        /**
         * Check to see if we are inside the aura processing 'loop'.
         */
        inAuraLoop : function() {
            return priv.auraStack.length > 0;
        },

        /**
         * Check to see if a public pop should be allowed.
         *
         * We allow a public pop if the name was pushed, or if there is nothing
         * on the stack.
         *
         * @param name the name of the public 'pop' that will happen.
         * @return true if the pop should be allowed.
         */
        checkPublicPop : function(name) {
            if (priv.auraStack.length > 0) {
                return priv.auraStack[priv.auraStack.length-1] === name;
            }
            //
            // Allow public pop calls on an empty stack for now.
            //
            return true;
        },

        /**
         * Push a new name on the stack.
         *
         * @param name the name of the item to push.
         */
        pushStack : function(name) {
            //#if {"modes" : ["PTEST"]}
            // to only profile the transactions and not the initial page load
            if (name == "onclick") {
                // clear out existing timers
                $A.removeStats();
                $A.getContext().clearTransactionName();
                // start a Jiffy transaction
                $A.startTransaction($A.getContext().incrementTransaction());
            }
            //#end
            priv.auraStack.push(name);
        },
        
        actionQueue : new ActionQueue(),

        /**
         * Pop an item off the stack.
         *
         * The name of the item must match the previously pushed. If this is the last
         * item on the stack we do post processing, which involves sending actions to
         * the server.
         *
         * @param name the name of the last item pushed.
         */
        popStack : function(name) {
            var count = 0;
            var lastName;
            var done;

            if (priv.auraStack.length > 0) {
                lastName = priv.auraStack.pop();
                if (lastName !== name) {
                    $A.error("Broken stack: popped "+lastName+" expected "+name+", stack = "+priv.auraStack);
                }
            } else {
                $A.warning("Pop from empty stack");
            }
            if (priv.auraStack.length === 0) {
                //
                // FIXME: W-1652120
                //
                // Weird compatibility stuff. We are sometimes called with nothing on the stack,
                // so, rather than work too hard on this, just push two things on the stack so
                // that even under those conditions we will not do the wrong thing.
                //
                priv.auraStack.push("$A.clientServices.popStack");
                priv.auraStack.push("$A.clientServices.popStack");
                clientService.processActions();
                done = !$A["finishedInit"];
                while (!done && count <= 15) {
                    $A.renderingService.rerenderDirty();
                    done = !clientService.processActions();
                    count += 1;
                    if (count > 14) {
                        $A.error("finishFiring has not completed after 15 loops");
                    }
                }
                // Force our stack to nothing.
                priv.auraStack = [];
                clientService.actionQueue.incrementNextActionGroupNumber();
            }
        },


        /**
         * Perform a hard refresh.
         *
         * @memberOf AuraClientService
         * @private
         */
        hardRefresh : function() {
            return priv.hardRefresh();
        },

        /**
         * Marks the application as outdated.
         *
         * @memberOf AuraClientService
         * @private
         */
        setOutdated : function() {
            return priv.setOutdated();
        },

        /**
         * A utility to handle events passed back from the server.
         */
        parseAndFireEvent : function(evtObj) {
            var descriptor = evtObj["descriptor"];

            if (evtObj["eventDef"]) {
                // register the event with the EventDefRegistry
                eventService.getEventDef(evtObj["eventDef"]);
            }

            if (eventService.hasHandlers(descriptor)) {
                var evt = $A.getEvt(descriptor);
                if (evtObj["attributes"]) {
                    evt.setParams(evtObj["attributes"]["values"]);
                }

                evt.fire();
            }
        },

        /**
         * For bootstrapping only
         *
         * @private
         */
        fireLoadEvent : function(eventName) {
            return priv.fireLoadEvent(eventName);
        },

        /**
         * Reset the token.
         *
         * @param {Object}
         *            newToken Refresh the current token with a new one.
         * @memberOf AuraClientService
         * @private
         */
        resetToken : function(newToken) {
            priv.token = newToken;
        },

        /**
         * Run the actions.
         *
         * @param {Object}
         *            actions
         * @param {function}
         *            scope The scope in which the function is executed
         * @param {function}
         *            callback The callback function to run
         * @memberOf AuraClientService
         * @private
         */
        runActions : function(actions, scope, callback) {
            var group = new ActionCallbackGroup(actions, scope, callback);
            priv.request(actions);
        },

        /**
         * Inject a component and set up its event handlers. For Integration
         * Service.
         *
         * @param {Component}
         *            parent
         * @param {Object}
         *            rawConfig
         * @param {String}
         *            placeholderId
         * @param {String}
         *            localId
         * @memberOf AuraClientService
         * @private
         */
        injectComponent : function(rawConfig, locatorDomId, localId) {
            var config = $A.util.json.resolveRefs(rawConfig);

            // Save off any context global stuff like new labels
            $A.getContext().join(config["context"]);

            var actionResult = config["actions"][0];
            var action = $A.get("c.aura://ComponentController.getComponent");

            action.setCallback(action, function(a) {
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
                    // Display the errors in a ui:message
                    // instead
                    componentConfig = {
                        "componentDef" : {
                            "descriptor" : "markup://ui:message"
                        },

                        "attributes" : {
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
                                                "value" : $A.util.json.encode(errors)
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    };
                }

                componentConfig["localId"] = localId;

                var root = $A.getRoot();
                var c = $A.componentService.newComponentDeprecated(componentConfig, root);

                if (!errors) {
                    // Wire up event handlers
                    var actionEventHandlers = config["actionEventHandlers"];
                    if (actionEventHandlers) {
                        var containerValueProvider = {
                            getValue : function(functionName) {
                                return {
                                    run : function(event) {
                                        window[functionName](event);
                                    }
                                };
                            }
                        };

                        for ( var event in actionEventHandlers) {
                            c.addHandler(event, containerValueProvider, actionEventHandlers[event]);
                        }
                    }
                }

                root.getValue("v.body").push(c);

                $A.render(c, element);

                $A.afterRender(c);
            });

            action.updateFromResponse(actionResult);
            action.complete($A.getContext());
        },

        /**
         * Return whether Aura believes it is online. This is only an educated
         * guess. Immediate and future communication with the server may fail.
         *
         * @return true if Aura believes it is online; false otherwise.
         */
        isConnected : function() {
            return !priv.isDisconnected;
        },

        /**
         * Queue an action for execution after the current event loop has ended.
         *
         * This must be called from within an event loop!
         *
         * @param {Action} action the action to enqueue
         * @param {Boolean} background if true the action will be backgrounded, otherwise the value of action.isBackground() is used.
         */
        enqueueAction : function(action, background) {
            $A.assert(!$A.util.isUndefinedOrNull(action), "EnqueueAction() cannot be called on an undefined or null action.");
            $A.assert(!$A.util.isUndefined(action.auraType)&& action.auraType==="Action", "Cannot call EnqueueAction() with a non Action parameter.");

            if (background) {
                action.setBackground();
            }
            
            //
            // FIXME: W-1652118 This should not differentiate, both of these should get pushed.
            //
            if (action.getDef().isClientAction()) {
                action.run();
            } 
            
            
            clientService.actionQueue.enqueue(action);
        },
        
        /**
         * process the current set of actions, looping if needed.
         *
         * This runs the current action set.
         *
         * @private
         */
        processActions : function() {
            var actions;
            var backgroundAction;
            var requestSent = false;

            //if an XHR is in flight request don't send a new request yet.
            if (priv.inRequest) {
                return false;
            }

            actions = clientService.actionQueue.getServerActions();
            if (actions.length > 0) {
                priv.request(actions);
                requestSent = true;
            }
            
            backgroundAction = clientService.actionQueue.getNextBackgroundAction();
            if (backgroundAction !== undefined) {
                priv.request(backgroundAction);
                requestSent = true;
            }
            return requestSent;
        }

        //#if {"excludeModes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
        ,
        "priv" : priv
    //#end
    };

    // #include aura.AuraClientService_export

    return clientService;
};
