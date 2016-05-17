({
    testElementProperties: function(cmp, event, helper) {
        var testUtils = cmp.get("v.testUtils");
        var elementPropertiesWhitelist = event.getParam("arguments").elementPropertiesWhitelist;
        var elementProperitesBlacklist = event.getParam("arguments").elementPropertiesBlacklist;
        var element = cmp.find("title").getElement();

        elementPropertiesWhitelist.forEach(function(name) {
            testUtils.assertTrue(name in element, "Expected property '" + name + "' to be a property on SecureElement");
        });
        elementProperitesBlacklist.forEach(function(name) {
            testUtils.assertFalse(name in element, "Expected property '" + name + "' to not be exposed on SecureElement");
        });
    },

    testHtmlProperties: function(cmp, event, helper) {
        var testUtils = cmp.get("v.testUtils");
        var htmlPropertiesWhitelist = event.getParam("arguments").htmlPropertiesWhitelist;
        var htmlPropertiesBlacklist = event.getParam("arguments").htmlPropertiesBlacklist;
        var element = cmp.find("title").getElement();

        htmlPropertiesWhitelist.forEach(function(name) {
            testUtils.assertTrue(name in element, "Expected property '" + name + "' to be a property on SecureElement");
        });
        htmlPropertiesBlacklist.forEach(function(name) {
            testUtils.assertFalse(name in element, "Expected property '" + name + "' to not be exposed on SecureElement");
        });
    },

    testExposedMethods: function(cmp, event, helper) {
        var testUtils = cmp.get("v.testUtils");
        var methodsWhitelist = event.getParam("arguments").methodsWhitelist;
        var element = cmp.find("title").getElement();

        methodsWhitelist.forEach(function(name) {
            testUtils.assertDefined(element[name]);
        });
    },

    testFramesBlocked: function(cmp, event, helper) {
        var testUtils = cmp.get("v.testUtils");

        try {
            document.createElement("frame");
            testUtils.fail("Should not have ben able to create a FRAME element");
        } catch(e) {
            testUtils.assertEquals(e.toString(), "The deprecated FRAME element is not supported in LockerService!");
        }
    },

    testRemoveEventListener: function(cmp, event) {
        var testUtils = cmp.get("v.testUtils");
        var counter = 0;

        var element = cmp.find("title").getElement();
        var testWithUseCapture = event.getParam("arguments").testWithUseCapture;
        var useCapture = undefined;
        if(testWithUseCapture) {
            useCapture = true;
        }

        element.addEventListener("click", function oneTimeClicker() {
                counter += 1;
                element.removeEventListener("click", oneTimeClicker, useCapture);
            }, useCapture);

        testUtils.clickOrTouch(element);
        // the event listener has been removed
        testUtils.clickOrTouch(element);

        testUtils.assertEquals(1, counter);
    },
    
    testInnerHTMLSupportsUseTagForSvgElement: function(cmp) {
        var testUtils = cmp.get("v.testUtils");

        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.innerHTML = '<defs> <text id="text" x="50" y="50">SVG</text> </defs>' +
                        '<use xlink:href="#text"></use>';
 
        var elements = svg.getElementsByTagName('use');
        testUtils.assertEquals(1, elements.length);
        testUtils.assertEquals('#text', elements[0].getAttribute('xlink:href'));
    },

    testTextContent: function(cmp) {
        var testUtils = cmp.get("v.testUtils");
        var element = document.createElement("div");
        element.textContent = "text content";
        testUtils.assertEquals("text content", element.textContent);
    },
    
    testInnerText: function(cmp) {
        var testUtils = cmp.get("v.testUtils");

        var element = document.createElement("div");
               
        // Node.innerText is not supported on all browsers
        if ("innerText" in element) {
            element.testInnerText = "innerText content";
            testUtils.assertEquals("innerText content", element.testInnerText);
        }
    },
    
    testAddEventListenerMultipleCalls : function(cmp, event, helper) {
        var testUtils = cmp.get("v.testUtils");
        
        var counter = 0;
        var handler1 = function() {
            counter += 0.3;
        }
        var handler2 = function() {
            counter += 1;
        }
        
        var element = cmp.find("title").getElement();
        element.addEventListener("click", handler1);
        
        // additional handlers should be allowed
        element.addEventListener("click", handler2);
        
        // adding an existing handler should not error out
        element.addEventListener("click", handler1);
        
        // again, no error on adding an existing handler
        element.addEventListener("click", handler2);
        
        testUtils.clickOrTouch(element);
        
        // each handler above should have been invoked once only
        testUtils.assertEquals(1.3, counter);
    }
})
