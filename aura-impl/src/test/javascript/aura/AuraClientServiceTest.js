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
Function.RegisterNamespace("Test.Aura");

[Fixture]
Test.Aura.AuraClientServiceTest = function() {
    var $A = {ns : {Util:{prototype:{on:function(){}}}}};
    var Aura = {Services: {}, Controller: {}, Utils: {Util:{prototype:{on:function(){}}}}};

    var Importer = Mocks.GetMocks(Object.Global(), {
        exp: function(){},
        "$A": $A,
        Aura: Aura
    });

    Importer(function () {
        // #import aura.controller.ActionQueue
    });

    Importer(function () {
        // #import aura.controller.ActionCollector
    });

    Importer(function () {
        // #import aura.controller.FlightCounter
    });

    Importer(function () {
        // #import aura.AuraClientService
    });

    var mockGlobal = Mocks.GetMocks(Object.Global(), {
        "$A": {
            log : function() {},
            assert : function(condition, message) {
                if(!condition){
                    throw message;
                }
            },
            util : {
                on: function() {},
                isUndefinedOrNull : function(obj){
                    return obj === undefined || obj === null;
                },
                isUndefined : function() {},
                isArray : function() {},
                json : {
                    encode :function(errorText) {
                        return "mockedJson:"+errorText;
                    },
                    orderedEncode: function(obj) {
                        return obj;
                    }
                }
            },
            mark : function() {}
        },
        window:{},
        document:{},
       Aura: Aura
    });
    
    [Fixture]
    function testCreateIntegrationErrorConfig() {
        [Fact]
        function ReturnsErrorConfig() {
            // Arrange
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var errorMsg = "Test Error Message";
            // Act
            var actual;
            mockGlobal(function() {
                actual = target.createIntegrationErrorConfig(errorMsg);
            });
            // Assert
            var expected;
            expected = {
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
                                            "value" : "mockedJson:"+errorMsg
                                        }
                                    }
                                }
                            ]
                        }
                    }
            };
            Assert.Equal(expected, actual);
        }

    }

    var id = 0;

    var MockAction = function(type) {
        this.auraType = "Action";
        this.setBackground = Stubs.GetMethod();
        this.id = ++id;
        if (type === undefined) {
            type = "server";
        }
        this.isAbortable = Stubs.GetMethod(false);
        this.isCaboose = Stubs.GetMethod(false);
        this.isBackground = Stubs.GetMethod(false);
        this.runDeprecated = Stubs.GetMethod();
        this.addCallbackGroup = Stubs.GetMethod();
        this.abortableId = undefined;
        this.getAbortableId = function () { return this.abortableId; };
        this.setAbortableId = function (nid) { this.abortableId = nid; };
        this.abort = Stubs.GetMethod();
        this.getDef = Stubs.GetMethod({
            isClientAction : Stubs.GetMethod(true),
            isServerAction : Stubs.GetMethod(false)
        });
        var sdef = Stubs.GetMethod({
            isClientAction : Stubs.GetMethod(false),
            isServerAction : Stubs.GetMethod(true)
        });
        if (type === "clientbackground") {
            this.isBackground = Stubs.GetMethod(true);
        } else if (type === "server") {
            this.getDef = sdef;
        } else if (type === "serverbackground") {
            this.getDef = sdef;
            this.isBackground = Stubs.GetMethod(true);
        } else if (type === "serverabortable") {
            this.getDef = sdef;
            this.isAbortable = Stubs.GetMethod(true);
        } else if (type === "serverforceboxcar") {
            this.getDef = sdef;
            this.isCaboose = Stubs.GetMethod(true);
        }
    };

    var MockActionQueue = function() {
        this.clientActions = [];
        this.serverActions = [];
        this.nextBackgroundAction = null;
        this.xhr = false;
        this.getClientActions = function() { return this.clientActions; };
        this.getServerActions = function() { return this.serverActions; };
        this.getNextBackgroundAction = function() { return this.nextBackgroundAction; };
        this.needXHR = function() { return this.xhr; };
    };

    [ Fixture ]
    function ProcessActions() {
        [ Fact ]
        function ReturnsFalseIfForegroundMax() {
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var actionQueue = new MockActionQueue();
            actionQueue.serverActions = [ "action" ];
            actionQueue.xhr = true;
            target.foreground.started = target.foreground.max;

            var actual;
            mockGlobal(function() {
                actual = target.processActions(actionQueue);
            });

            Assert.False(actual);
        }

        [ Fact ]
        function ReturnsFalseIfBackgroundMax() {
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var actionQueue = new MockActionQueue();
            actionQueue.nextBackgroundAction = "action";
            target.background.started = target.background.max;

            var actual;
            mockGlobal(function() {
                actual = target.processActions(actionQueue);
            });

            Assert.False(actual);
        }

        [ Fact ]
        function ReturnsFalseIfQueueEmpty() {
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });

            var actual;
            mockGlobal(function() {
                actual = target.processActions(new MockActionQueue());
            });

            Assert.False(actual);
        }

        [ Fact, Skip ]
        function CallsRequestIfServerActionsAvailable() {
            var action = "server";
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var request = Stubs.GetMethod("actions", "flightCounter", undefined);
            var actionQueue = new MockActionQueue();
            actionQueue.serverActions = [ action ];
            actionQueue.xhr = true;

            mockGlobal(function() {
                target.processActions(actionQueue, request);
            });

            Assert.Equal([ {
                Arguments : {
                    actions : [ action ],
                    flightCounter : target.foreground
                },
                ReturnValue : undefined
            } ], request.Calls);
        }

        [ Fact ]
        function DoesNotCallRequestIfXhrSetToFalse() {
            var action = "server";
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var actionQueue = new MockActionQueue();
            actionQueue.serverActions = [ action ];
            actionQueue.xhr = false;

            var actual;
            mockGlobal(function() {
                actual = target.processActions(actionQueue);
            });

            Assert.False(actual);
        }

        [ Fact, Skip ]
        function ReturnsTrueIfServerActionsSent() {
            var action = "server";
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var request = function() {
            };
            var actionQueue = new MockActionQueue();
            actionQueue.serverActions = [ action ];
            actionQueue.xhr = true;

            var actual;
            mockGlobal(function() {
                actual = target.processActions(actionQueue, request);
            });
            Assert.True(actual);
        }

        [ Fact, Skip ]
        function CallsRequestIfBackgroundActionAvailable() {
            var action = "background";
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var request = Stubs.GetMethod("actions", "flightCounter", undefined);
            var actionQueue = new MockActionQueue();
            actionQueue.nextBackgroundAction = action;

            var actual;
            mockGlobal(function() {
                actual = target.processActions(actionQueue, request);
            });

            Assert.Equal([ {
                Arguments : {
                    actions : [ action ],
                    flightCounter : target.background
                },
                ReturnValue : undefined
            } ], request.Calls);
        }

        [ Fact, Skip ]
        function ReturnsTrueIfBackgroundActionSent() {
            var action = "background";
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var request = function() {
            };
            var actionQueue = new MockActionQueue();
            actionQueue.nextBackgroundAction = action;

            var actual;
            mockGlobal(function() {
                actual = target.processActions(actionQueue, request);
            });

            Assert.True(actual);
        }

        [ Fact, Skip ]
        function CallsRequestForBothServerAndBackgroundActions() {
            var actionServer = "server";
            var actionBackground = "background";
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var request = Stubs.GetMethod("actions", "flightCounter", undefined);
            var actionQueue = new MockActionQueue();
            actionQueue.serverActions = [ actionServer ];
            actionQueue.xhr = true;
            actionQueue.nextBackgroundAction = actionBackground;

            var actual;
            mockGlobal(function() {
                actual = target.processActions(actionQueue, request);
            });

            Assert.Equal([ {
                Arguments : {
                    actions : [ actionServer ],
                    flightCounter : target.foreground
                },
                ReturnValue : undefined
            }, {
                Arguments : {
                    actions : [ actionBackground ],
                    flightCounter : target.background
                },
                ReturnValue : undefined
            } ], request.Calls);
        }
    }

    [ Fixture ]
    function actionServices() {

        // Mock action storage returned by the mockAction service when getStorage("action") is invoked.
        // This object has a setup method which allows the test to assert what parameters should be passed into its
        // get, put and remove functions.
        var mockActionStorage = new (function MockActionStorage() {

            this.setup = function(stubs) {
                this._stubs = stubs;
            };

            this.clear = function() {
                var that = this;
                return new Promise(function(success, error) {
                    delete that._stubs;
                    success();
                });
            };

            this.get = function(key) {
                var that = this;
                return new Promise(function(success, error) {
                    if (that._stubs && that._stubs.get) {
                        var value = { value : that._stubs.get[key], isExpired : false };
                        success(value);
                    } else {
                        throw "actionsStorage.get(..) called before it was stubbed out.";
                    }
                });
            };

            this.put = function(key, value) {
                var that = this;
                return new Promise(function(success, error) {
                    if (that._stubs && that._stubs.put) {
                        if (value === that._stubs.put[key]) {
                            success();
                        } else {
                            error("put stub not found for key: " + key);
                        }
                    } else {
                        throw "actionsStorage.put(..) called before it was stubbed out.";
                    }
                });
            };

            this.remove = function(key) {
                var that = this;
                return new Promise(function(success, error) {
                    if (that._stubs && that._stubs.remove) {
                        if (key === that._stubs.remove){
                            success();
                        } else {
                            error("remove stub not found for key: " + key);
                        }
                    } else {
                        throw "actionsStorage.remove(..) called before it was stubbed out.";
                    }
                });
            };

            this.adapter = {
                setItem: function() {}
            };
        })();

        // Sets up the environment with a mock action storage:
        var mockActionService = function(delegate) {
            Mocks.GetMocks(Object.Global(), {
                Aura: Aura,
                "$A" : {
                    "storageService": {
                        "getStorage": function(name) {
                            Assert.Equal("actions", name, "action service should only access the 'actions' cache");
                            return mockActionStorage;
                        }
                    },
                    ns : {
                        Util : {
                            prototype : {
                                on : function() {
                                }
                            }
                        }
                    },
                    assert : function() {},
                    mark : function() {},
                    util : {
                        json : {
                            encode : function(toEncode) {
                                return "<<" + JSON.stringify(toEncode) + ">>";
                            },
                            orderedEncode: function(obj) {
                                return this.encode(obj);
                            }

                        },
                        isString : function(obj) {
                            return typeof obj === 'string';
                        },
                        isArray : function(obj) {
                            return obj instanceof Array;
                        },
                        isObject: function(obj) {
                            return typeof obj === "object" && obj !== null && !(obj instanceof Array);
                        },
                        map: function(array, transformer, that) {
                            return array.map(transformer, that);
                        },
                        keys: Object.keys,
                        sortObject: function(obj) {
                            return obj
                        }
                    },
                    run : function (cb) {
                        cb();
                    },
                    error : function (err) {
                        throw err;
                    },
                    warning : function (warn) {},
                    log : function (msg) {}
                },
                setTimeout : function(cb, time) {
                    cb();
                },
                Promise : function(func) {
                    return {
                        then: function(suc, err) { func(suc, err); }
                    };
                },
                exp: function() {},
                window: Object.Global()
            })(function() {
                // #import aura.AuraClientService
                // #import aura.controller.Action
                mockActionStorage.clear()
                    .then(function() { delegate(new Aura.Services.AuraClientService(), mockActionStorage); });
            });
        };

        function assertBool(bool, message) {
            return function(result) {
                Assert[bool ? "True" : "False"](result, message);
            }
        }

        [ Fact ]
        function testIsInStorage() {
            mockActionService(function(service, storage) {
                var descriptor = "DESCRIPTOR";
                var params = {params: "PARAMS"};
                var stored = "STORED";

                var get = {};
                get[Action.getStorageKey(descriptor, params)] = stored;

                storage.setup({get: get});

                // don't worry about async, the mocks do everything synchronously.

                // With descriptor and params, the action is indeed found:
                service.isActionInStorage(descriptor, params, Assert.True);

                // With invalid descriptor/params the callback is invoked with false:
                service.isActionInStorage(descriptor, {}, assertBool(false, "Wrong params."));
                service.isActionInStorage("", params, assertBool(false, "Wrong descriptor."));
                service.isActionInStorage(undefined, params, assertBool(false, "Undefined descriptor."));
                service.isActionInStorage(null, params, assertBool(false, "Null descriptor."));
                service.isActionInStorage(true, params, assertBool(false, "Boolean descriptor."));
                service.isActionInStorage([], params, assertBool(false, "Array descriptor."));
                service.isActionInStorage(descriptor, undefined, assertBool(false, "Undefined params."));
                service.isActionInStorage(descriptor, null, assertBool(false, "Null params."));
                service.isActionInStorage(descriptor, true, assertBool(false, "Boolean params."));
                service.isActionInStorage(descriptor, [], assertBool(false, "Array params."));
            });
        }

        [ Fact ]
        function testRevalidateAction() {
            mockActionService(function(service, storage) {
                var descriptor = "DESCRIPTOR";
                var params = {params: "PARAMS"};
                var stored = "STORED";

                var access = {};
                access[Action.getStorageKey(descriptor, params)] = stored;

                storage.setup({
                    get: access,
                    put: access
                });

                // don't worry about async, the mocks do everything synchronously.

                // With descriptor and params, the action is revalidated:
                service.revalidateAction(descriptor, params, Assert.True);

                // With invalid descriptor/params the callback is invoked with false:
                service.revalidateAction(descriptor, {}, assertBool(false, "Wrong params."));
                service.revalidateAction("", params, assertBool(false, "Wrong descriptor."));
                service.revalidateAction(undefined, params, assertBool(false, "Undefined descriptor."));
                service.revalidateAction(null, params, assertBool(false, "Null descriptor."));
                service.revalidateAction(true, params, assertBool(false, "Boolean descriptor."));
                service.revalidateAction([], params, assertBool(false, "Array descriptor."));
                service.revalidateAction(descriptor, undefined, assertBool(false, "Undefined params."));
                service.revalidateAction(descriptor, null, assertBool(false, "Null params."));
                service.revalidateAction(descriptor, true, assertBool(false, "Boolean params."));
                service.revalidateAction(descriptor, [], assertBool(false, "Array params."));
            });
        }

        [ Fact ]
        function testInvalidateAction() {
            mockActionService(function(service, storage) {
                var descriptor = "DESCRIPTOR";
                var params = {params: "PARAMS"};
                var stored = "STORED";

                storage.setup({
                    remove: Action.getStorageKey(descriptor, params)
                });

                // don't worry about async, the mocks do everything synchronously.

                // With descriptor and params, the action is re-validated:
                service.invalidateAction(descriptor, params, Assert.True);

                // When the actions are non-existent, remove is still called on them regardless of whether or not
                // they are currently stored (test to ensure that the mockActionStorage is called with action keys it's
                // not rigged to except by ensuring it throws the appropriate exceptions):
                service.invalidateAction(
                    descriptor,
                    {},
                    assertBool(false, "Wrong params."),
                    function(err) { Assert.Equal("remove stub not found for key: DESCRIPTOR:<<{}>>", err); }
                );
                service.invalidateAction(
                    "",
                    params,
                    assertBool(false, "Wrong descriptor."),
                    function(err) { Assert.Equal("remove stub not found for key: :<<{\"params\":\"PARAMS\"}>>", err); }
                );

                // With invalid descriptor/params the callback is invoked with false:
                service.invalidateAction(undefined, params, assertBool(false, "Undefined descriptor."));
                service.invalidateAction(null, params, assertBool(false, "Null descriptor."));
                service.invalidateAction(true, params, assertBool(false, "Boolean descriptor."));
                service.invalidateAction([], params, assertBool(false, "Array descriptor."));
                service.invalidateAction(descriptor, undefined, assertBool(false, "Undefined params."));
                service.invalidateAction(descriptor, null, assertBool(false, "Null params."));
                service.invalidateAction(descriptor, true, assertBool(false, "Boolean params."));
                service.invalidateAction(descriptor, [], assertBool(false, "Array params."));
            });
        }

        [Fact]
        function testResetToken() {
            mockActionService(function(service, storage) {
                service.saveTokenToStorage = function() {};

                // Act
                service.resetToken("myToken");

                // Assert
                var expected = "myToken";
                actual = service._token;
                Assert.Equal(expected, actual);
            });
        }
    }

    [Fixture]
    function isBB10() {
        [Fact]
        function ReturnsTrueForZ10() {
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var mockUserAgent = Mocks.GetMock(Object.Global(), "navigator", {
                userAgent: "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+"
            });

            var actual;
            mockUserAgent(function(){
                actual = target.isBB10();
            });

            Assert.Equal(true, actual);
        }

        [Fact]
        function ReturnsFalseForNonBB10Blackberry() {
            var target;
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });
            var mockUserAgent = Mocks.GetMock(Object.Global(), "navigator", {
                userAgent: "Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0 Mobile Safari/534.11+"
            });

            var actual;
            mockUserAgent(function(){
                actual = target.isBB10();
            });

            Assert.Equal(false, actual);
        }
    }

    [Fixture]
    function handleAppCache() {
        var storageClearCalled = false;
        var componentDefsClearCalled = false;
        var evtCallbacks = {};
        var mockApplicationCache = {
            "addEventListener": function(evt, callback) {
                evtCallbacks[evt] = callback;
            }
        };

        var mockStorage = {
            clear: function() {
                storageClearCalled = true;
            }
        };

        var mockLocation = { reload: function() {} };

        var mockComponentService = {
            registry: {
                clearCache: function() {
                    componentDefsClearCalled = true;
                }
            }
        };

        var mockDeps = Mocks.GetMocks(Object.Global(), {
            "$A": {
                log : function() {},
                assert : function(condition, message) {
                    if(!condition){
                        throw message;
                    }
                },
                util : {
                    on: function() {},
                    isUndefinedOrNull : function(obj){
                        return obj === undefined || obj === null;
                    },
                    isUndefined : function() {},
                    isArray : function() {},
                    json : {
                        encode :function(errorText) {
                            return "mockedJson:"+errorText;
                        },
                        orderedEncode: function(obj) {
                            return obj;
                        }
                    }
                },
                mark : function() {},
                componentService: mockComponentService
            },
            window:{
                "applicationCache": mockApplicationCache,
                "localStorage": mockStorage,
                "sessionStorage": mockStorage
            },
            Aura: Aura,
            location: mockLocation
        });

        var targetService;
        mockDeps(function() {
            targetService = new Aura.Services.AuraClientService();
        });

        [Fact]
        function doesNotCallLocalStorageClearWhenUpdateReady() {
            storageClearCalled = false;
            componentDefsClearCalled = false;

            mockDeps(function() {
                evtCallbacks["updateready"]();
            });

            Assert.False(storageClearCalled);
        }

        [Fact]
        function doesNotCallSessionStorageClearWhenUpdateReady() {
            storageClearCalled = false;
            componentDefsClearCalled = false;

            mockDeps(function() {
                evtCallbacks["updateready"]();
            });

            Assert.False(storageClearCalled);
        }

        [Fact]
        function callsComponentRegistryClearWhenUpdateReady() {
            storageClearCalled = false;
            componentDefsClearCalled = false;

            mockDeps(function() {
                evtCallbacks["updateready"]();
            });

            Assert.True(componentDefsClearCalled);
        }
    }

    [Fixture]
    function hardRefresh() {
        [Fact]
        function replacesSpaceInUrlWithPlus() {
            var target, expected, actual;
            var mockDeps = Mocks.GetMocks(Object.Global(), {
                document: {
                    body: {
                        parentNode: {
                            getAttribute: function() {return true;}
                        }
                    }
                },
                navigator: {
                    userAgent: ""
                },
                window: {},
                history: {
                    pushState: function(state, title, url) {
                        actual = url;
                    }
                },
                location: {
                    href: "http://localhost:9090/auratest/testPerfRunner.app?foo=bar bar"
                }
            });

            expected = "testPerfRunner.app?nocache=http%3A%2F%2Flocalhost%3A9090%2Fauratest%2FtestPerfRunner.app%3Ffoo%3Dbar%2bbar";
            mockGlobal(function() {
                target = new Aura.Services.AuraClientService();
            });

            mockDeps(function() {
                target.hardRefresh();
            });

            Assert.Equal(expected, actual);
        }
    }
}
