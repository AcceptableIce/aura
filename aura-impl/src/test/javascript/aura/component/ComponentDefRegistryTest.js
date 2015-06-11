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
Function.RegisterNamespace("Test.Aura.Component");

[Fixture]
Test.Aura.Component.ComponentDefRegistryTest = function () {
    
    var Aura = {Component: {}};

    Mocks.GetMocks(Object.Global(), {
        "window" : {},
        Aura: Aura
    })
    (function () {
        [Import("aura-impl/src/main/resources/aura/component/ComponentDefRegistry.js")]
    });

    var makeDefDescriptor = function (name) {
        return {
            "toString": function () {
                return name;
            },
            "getNamespace": function () {
                return name;
            }
        };
    };

    var mockComponentDef = Mocks.GetMocks(Object.Global(), {
        "$A": {
            util: {
                isString: function () {
                    return true;
                },
                isUndefinedOrNull: function (obj) {
                    return obj === undefined || obj === null;
                }
            },
            warning: function (message, error) {
            },
            assert: function (condition, message) {
                if (!condition) {
                    throw new Error(message);
                }
            },
            Perf: {
                mark: function () {
                },
                endMark: function () {
                }
            }
        },

        ComponentDef: function (config) {
            return {
                "config": config,
                "getDescriptor": function () {
                    return makeDefDescriptor(config["descriptor"]);
                }
            }
        }
    });

    var mockAuraUtil = Mocks.GetMocks(Object.Global(),{
        "$A": {
            util: {
                isString: function () {
                    return true;
                },
                isUndefinedOrNull: function (obj) {
                    return obj === undefined || obj === null;
                }
            },
            warning: function (message, error) {},
            assert: function (condition, message) {
                if (!condition) {
                    throw Error(message);
                }
            },
            Perf: {
                mark: function () {
                },
                endMark: function () {
                }
            }
        },
        Aura: Aura
    });

    [Fixture]
    function AuraType() {
        [Fact]
        function HasCorrectAuraType() {
            // Arrange
            var expected = "ComponentDefRegistry";

            // Act
            var target = new ComponentDefRegistry();
            var actual = target.auraType;

            // Assert
            Assert.Equal(expected, actual);
        }
    }

    [Fixture]
    function GetDef() {

        [Fact]
        function ThrowsIfConfigParamUndefined() {
            // Arrange
            var target = new ComponentDefRegistry();
            var expected = "No ComponentDef descriptor specified";
            var actual;

            // Act
            mockAuraUtil(function () {
                actual = Record.Exception(function () {
                    target.getDef(undefined);
                })
            });

            // Assert
            Assert.Equal(expected, actual);

        }
    }

    [Fixture]
    function CreateDef() {

        [Fact]
        function ThrowsIfNoConfig() {
            // Arrange
            var target = new ComponentDefRegistry();
            var expected = "ComponentDef config required for registration";
            var actual;

            // Act
            mockAuraUtil(function () {
                actual = Record.Exception(function () {
                    target.createDef(undefined);
                })
            });

            // Assert
            Assert.Equal(expected, actual);

        }

        [Fact]
        function ThrowsIfNoDescriptor() {
            // Arrange
            var target = new ComponentDefRegistry();
            var expected = "ComponentDef config required for registration";
            var actual;

            // Act
            mockAuraUtil(function () {
                actual = Record.Exception(function () {
                    target.createDef({});
                })
            });

            // Assert
            Assert.Equal(expected, actual);

        }

        [Fact]
        function ShouldNotSaveIfDefExists() {
            var expected = "ComponentDef";
            var target = new ComponentDefRegistry();
            var descriptor = "markup://foo:bar";
            var saved = false;
            var actual;
            var newConfig = {
                "descriptor": descriptor,
                "rendererDef": {}
            };

            target.componentDefs[descriptor] = expected;
            target.saveComponentDef = function() {
                saved = true;
            };

            mockAuraUtil(function() {
                actual = target.createDef(newConfig);
            });

            Assert.Equal(expected, actual);
            Assert.False(saved);
        }

        [Fact]
        function ShouldSaveIfDefDoesntExist() {
            var target = new ComponentDefRegistry();
            var descriptor = "markup://foo:bar";
            var saved = false;
            var newConfig = {
                "descriptor": descriptor,
                "rendererDef": {}
            };

            target.saveComponentDef = function() {
                saved = true;
            };
            target.storeDef = function() {};

            mockAuraUtil(function() {
                target.createDef(newConfig);
            });

            Assert.True(saved);
        }
    }

    [Fixture]
    function SaveComponentDef() {

        [Fact]
        function ShouldAddToDynamicNamespaces() {
            var target = new ComponentDefRegistry();
            var descriptor = "layout://foo:bar";
            var newConfig = {
                "descriptor": descriptor,
                "rendererDef": {}
            };

            mockComponentDef(function () {
                target.saveComponentDef(newConfig);
            });

            Assert.True(target.dynamicNamespaces.length > 0);
        }

        [Fact]
        function ShouldNotAddToDynamicNamespaces() {
            var target = new ComponentDefRegistry();
            var descriptor = "markup://foo:bar";
            var newConfig = {
                "descriptor": descriptor,
                "rendererDef": {}
            };

            mockComponentDef(function () {
                target.saveComponentDef(newConfig);
            });

            Assert.True(target.dynamicNamespaces.length == 0);
        }
    }

    [Fixture]
    function ShouldStore() {

        [Fact]
        function ShouldNotStoreNonLayoutDef() {
            var target = new ComponentDefRegistry();
            Assert.False(target.shouldStore("markup://foo:bar"));
        }

        [Fact]
        function ShouldStoreLayoutDef() {
            var target = new ComponentDefRegistry();
            Assert.True(target.shouldStore("layout://foo:bar"));
        }
    }

    [Fixture]
    function SetupDefinitionStorage() {

        var mockStorageService = function (persistent, secure) {
            return Mocks.GetMock(Object.Global(), "$A", {
                storageService: {
                    initStorage: function() {
                        return {
                            isPersistent: function() {
                                return persistent;
                            },
                            isSecure: function() {
                                return secure
                            }
                        }
                    },
                    deleteStorage: function() {}
                },
                getContext: function() {
                    return {
                        getApp: function() {
                            return "foo";
                        }
                    }
                }
            });
        };

        [Fact]
        function ShouldNotUseNotPersistentStorage() {
            var target = new ComponentDefRegistry();
            target.useDefStore = undefined;
            mockStorageService(false, false)(function () {
                target.setupDefinitionStorage();
            });

            Assert.False(target.useDefStore);
            Assert.True(target.definitionStorage === undefined);
        }

        function OnlyUsePersistent() {
            var target = new ComponentDefRegistry();
            target.useDefStore = undefined;
            mockStorageService(true, false)(function () {
                target.setupDefinitionStorage();
            });

            Assert.True(target.useDefStore);
            Assert.True(target.definitionStorage !== undefined);
        }

    }

    [Fixture]
    function RemoveDef() {

        [Fact]
        function RemoveDef() {
            var target = new ComponentDefRegistry();
            target.componentDefs = {
                "markup://foo:bar": "hello"
            };
            target.useDefinitionStorage = function() {
                return false;
            };

            target.removeDef("markup://foo:bar");

            Assert.Undefined(target.componentDefs["markup://foo:bar"]);
        }

        [Fact]
        function RemoveLayoutDef() {
            var target = new ComponentDefRegistry();
            var descriptor = "layout://foo:bar";
            target.componentDefs = {
                "layout://foo:bar": "hello"
            };
            target.useDefinitionStorage = function() {
                return true;
            };
            target.shouldStore = function() {
                return true;
            };
            var actual;
            target.definitionStorage = {
                remove: function(descriptor) {
                    actual = descriptor;
                }
            };

            target.removeDef(descriptor);

            Assert.Undefined(target.componentDefs[descriptor]);
            Assert.Equal(descriptor, actual);
        }
    }
};
