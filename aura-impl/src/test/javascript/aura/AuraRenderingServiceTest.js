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
Test.Aura.AuraRenderingServiceTest = function(){
    var $A = {
        ns : {}
    };

    //Mock the exp() function defined in Aura.js, this is originally used for exposing members using a export.js file
    Mocks.GetMocks(Object.Global(), { "exp": function(){}, "$A":$A})(function(){
        // #import aura.AuraRenderingService
    });

    // Mocks necessary to create a new AuraComponentService Object
    var mockOnLoadUtil = Mocks.GetMocks(Object.Global(), {
        "ComponentDefRegistry": function(){},
        "ControllerDefRegistry": function(){},
        "ActionDefRegistry": function(){},
        "ModelDefRegistry": function(){},
        "ProviderDefRegistry": function(){},
        "RendererDefRegistry": function(){},
        "HelperDefRegistry": function(){},
        "exp": function(){},
        "$A": $A
    });

    var getFakeComponent = function(valid, rendered, name) {
        var rendererDef = {
            rerender : Stubs.GetMethod("component", null),
            unrender : Stubs.GetMethod("component", null),
            afterRender : Stubs.GetMethod("component", null)
        };
        return {
            getGlobalId : function() { return "1"; },
            getElements : function() { return [ "1" ]; },
            isValid : function() { return valid; },
            getDef : function() {
                return {
                    getDescriptor : function() { return name; },
                };
            },
            render : Stubs.GetMethod("xxx", "yyy", null),
            isRendered : function() { return rendered; },
            setRendered : Stubs.GetMethod('value', null),
            getRenderer : function () {
                return {
                    def : rendererDef,
                    renderable : name
                };
            }
        };
    };

    var forceStub = function(fakeComp, name, fn) {
        if (name == 'render') {
            fakeComp.render = fn;
        } else {
            fakeComp.getRenderer().def[name] = fn;
        }
    };

    var getStubs = function(fakeComp) {
        var stubs = {};
        var renderer = fakeComp.getRenderer().def;
        stubs.rerender = renderer.rerender;
        stubs.unrender = renderer.unrender;
        stubs.afterRender = renderer.afterRender;
        stubs.render = fakeComp.render;
        return stubs;
    };

    var getMockAuraInfo = function(shouldBeComponent) {
        var stubbedLogger = Stubs.GetMethod("msg", "error", null);
        return {
            "stubbedLogger":stubbedLogger,
            "mock":Mocks.GetMock(Object.Global(), "$A", {
                util : {
                    isComponent : function() { return shouldBeComponent; },
                    isArray : function(obj) { return obj instanceof Array; },
                },
                error : stubbedLogger
            })
        };
    };

    var validateError = function(mockAuraInfo, msgContains, error) {
        Assert.Equal(1, mockAuraInfo.stubbedLogger.Calls.length);
        Assert.True(mockAuraInfo.stubbedLogger.Calls[0].Arguments.msg.indexOf(msgContains) >= 0);
        Assert.Equal(error, mockAuraInfo.stubbedLogger.Calls[0].Arguments.error);
    };

    [Fixture]
    function Rerender(){
        [Fact]
        function AssertRerenderCalled() {
            var target;
            mockOnLoadUtil(function(){
                target = new $A.ns.AuraRenderingService();
            });
            var mockAuraInfo = getMockAuraInfo(true);
            var expectedRenderable = 'value';
            var mockComponent = getFakeComponent(true, true, expectedRenderable);
            // Act
            mockAuraInfo.mock(function() {
                target.rerender(mockComponent);
            });
            stubs = getStubs(mockComponent);
            // AfterRender is not called when re-rendering, except for newly rendered sub-components.
            Assert.Equal(0, stubs.afterRender.Calls.length);
            Assert.Equal(0, stubs.render.Calls.length);
            Assert.Equal(1, stubs.rerender.Calls.length);
            Assert.Equal(expectedRenderable, stubs.rerender.Calls[0].Arguments.component);
            Assert.Equal(0, stubs.unrender.Calls.length);
        }
    }

    [Fixture]
    function AfterRender(){
        [Fact]
        function ErrorOnNoComponent() {
            var target;
            mockOnLoadUtil(function(){
                target = new $A.ns.AuraRenderingService();
            });
            var mockAuraInfo = getMockAuraInfo(false);
            var mockComponent = 'bad';
            // Act
            mockAuraInfo.mock(function() {
                target.afterRender(mockComponent);
            });
            validateError(mockAuraInfo, "'bad'", undefined);
        }

        [Fact]
        function AssertAfterRenderNotCalledForInvalid() {
            var target;
            mockOnLoadUtil(function(){
                target = new $A.ns.AuraRenderingService();
            });
            var stubbedAfterRender = Stubs.GetMethod("rendered", null);
            var mockAuraInfo = getMockAuraInfo(true);
            var mockComponent = getFakeComponent(false, undefined, undefined)

            // Act
            mockAuraInfo.mock(function() {
                target.afterRender(mockComponent);
            });
            stubs = getStubs(mockComponent);
            Assert.Equal(stubs.afterRender.Calls.length, 0);
            Assert.Equal(stubs.render.Calls.length, 0);
            Assert.Equal(stubs.rerender.Calls.length, 0);
            Assert.Equal(stubs.unrender.Calls.length, 0);
        }

        [Fact]
        function ErrorOnAfterRenderThrows() {
            var target;
            mockOnLoadUtil(function(){
                target = new $A.ns.AuraRenderingService();
            });
            var expected = new Error("expected");
            var mockAuraInfo = getMockAuraInfo(true);
            var mockComponent = getFakeComponent(true, true, 'rendered');
            forceStub(mockComponent, 'afterRender', function () { throw expected; });
            // Act
            mockAuraInfo.mock(function() {
                target.afterRender(mockComponent);
            });
            validateError(mockAuraInfo, "'rendered'", expected);
            stubs = getStubs(mockComponent);
            //AfterRender is not a stub, it is replaced above.
            //Assert.Equal(stubs.afterRender.Calls.length, 1);
            Assert.Equal(0, stubs.render.Calls.length);
            Assert.Equal(0, stubs.rerender.Calls.length);
            Assert.Equal(0, stubs.unrender.Calls.length);
        }
    }
}
