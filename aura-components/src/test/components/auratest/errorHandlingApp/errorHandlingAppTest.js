({
    /**
     * Verify that AuraError's severity default value is Alert
     */
    testAuraErrorDefaultSeverity : {
        attributes: {"handleSystemError": true},
        test: function(cmp) {
            $A.test.expectAuraError("AuraError from app client controller");
            $A.test.clickOrTouch(cmp.find("auraErrorFromClientControllerButton").getElement());
            //cmp.throwAuraErrorFromClientController();

            var expected = $A.severity.ALERT;
            var actual = cmp.get("v.severity");

            // set handler back to default, so that error model can show up
            cmp.set("v.handleSystemError", false);
            $A.test.assertEquals(expected, actual);
        }
    },

    /**
     * Verify that AuraError's severity default value is Quiet
     */
    testAuraFriendlyErrorDefaultSeverity : {
        attributes: {"handleSystemError": true},
        test: function(cmp) {
            $A.test.expectAuraError("AuraFriendlyError from app client controller");
            $A.test.clickOrTouch(cmp.find("auraFriendlyErrorFromClientControllerButton").getElement());

            var expected = $A.severity.QUIET;
            var actual = cmp.get("v.severity");

            // set handler back to default, so that error model can show up
            cmp.set("v.handleSystemError", false);
            $A.test.assertEquals(expected, actual);
        }
    },

    /**
     * Verify that AuraError's severity default value is Alert
     */
    testAuraErrorWithNonDefaultSeverityInHanlder : {
        attributes: {
            "handleSystemError": true,
            "severity": "FATAL"
        },
        test: function(cmp) {
            $A.test.expectAuraError("AuraError from app client controller");
            $A.test.clickOrTouch(cmp.find("auraErrorFromClientControllerButton").getElement());

            var expected = $A.severity.FATAL;
            var actual = cmp.get("v.severity");

            // set handler back to default, so that error model can show up
            cmp.set("v.handleSystemError", false);
            $A.test.assertEquals(expected, actual);
        }
    },

    /**
     * Verify that a non-AuraError is wrapped in an AuraError when it's handled in error handler
     */
     testNonAuraErrorIsWrappedAsAuraErrorInHandler: {
        attributes: {"handleSystemError": true},
        test: function(cmp) {
            var expectedMessage = "Error from app client controller";
            $A.test.expectAuraError(expectedMessage);
            $A.test.clickOrTouch(cmp.find("errorFromClientControllerButton").getElement());

            // cmp._auraError gets assigned in error handler
            var targetError = cmp._auraError;
            cmp.set("v.handleSystemError", false);
            $A.test.assertTrue(targetError instanceof AuraError);
            $A.test.assertTrue($A.test.contains(targetError.message, expectedMessage),
                    "Error in handler doesn't contain the original error message.");
        }
     },

    /**
     * Verify that failing descriptor is correct when an AuraError gets thrown
     */
    testFailingDescriptorWhenAuraErrorIsThrown : {
        test: function(cmp) {
            $A.test.expectAuraError("AuraError from app client controller");
            $A.test.clickOrTouch(cmp.find("auraErrorFromClientControllerButton").getElement());


            var actual = this.findFailingDescriptorFromErrorModal();
            //auratest$errorHandlingApp$controller$throwAuraErrorFromClientController
            var action = cmp.get("c.throwAuraErrorFromClientController");
            var expected = action.getDef().toString();

            $A.test.assertEquals(expected, actual);
        }
    },

    testFailingDescriptorForErrorFromCreateComponentCallback: {
        test: [
            function(cmp) {
                $A.test.expectAuraError("Error from createComponent callback in app");
                $A.test.clickOrTouch(cmp.find("errorFromCreateComponentCallbackButton").getElement());

                this.waitForErrorModal();
            },
            function(cmp) {
                var actual = this.findFailingDescriptorFromErrorModal();
                var action = cmp.get("c.throwErrorFromCreateComponentCallback");
                var expected = action.getDef().toString();

                $A.test.assertEquals(expected, actual);
            }
        ]
    },

    /**
     * Verify that failing descriptor is correct when an Error gets thrown from aura:method.
     * The test approach is to click a button to call aura:method in controller.
     */
    testFailingDescriptorForErrorFromAuraMethodHandler: {
        test: function(cmp) {
            $A.test.expectAuraError("Error from app client controller");
            $A.test.clickOrTouch(cmp.find("errorFromAuraMethodHandlerButton").getElement());

            var actual = this.findFailingDescriptorFromErrorModal();
            // expects the descriptor is where the error happens
            var action = cmp.get("c.throwErrorFromClientController");
            var expected = action.getDef().toString();

            $A.test.assertEquals(expected, actual);
        }
    },

    testFailingDescriptorForErrorFromAuraMethodWithCallback: {
        test: [
            function(cmp) {
                $A.test.expectAuraError("Error from server action callback in app");
                var action = cmp.get("c.throwErrorFromAuraMethodHandlerWithCallback");
                $A.enqueueAction(action);
                this.waitForErrorModal();
            },
            function(cmp) {
                var actual = this.findFailingDescriptorFromErrorModal();
                var expected = cmp.getDef().getDescriptor().getQualifiedName();

                $A.test.assertEquals(expected, actual);
            }
        ]
    },

    testFailingDescriptorForErrorFromContainedCmpController: {
        test: function(cmp) {
            $A.test.expectAuraError("Error from component client controller");
            $A.test.clickOrTouch(cmp.find("errorFromContainedCmpControllerButton").getElement());

            var actual = this.findFailingDescriptorFromErrorModal();
            var action = cmp.find("containedCmp").get("c.throwErrorFromClientController");
            var expected = action.getDef().toString();

            $A.test.assertEquals(expected, actual);
        }
    },

    testFailingDescriptorForErrorFromContainedCmpCallback: {
        test: [
            function(cmp) {
                $A.test.expectAuraError("Error from function wrapped in getCallback in component");
                var action = cmp.get("c.throwErrorFromContainedCmpCallback");
                $A.enqueueAction(action);
                this.waitForErrorModal();
            },
            function(cmp) {
                var actual = this.findFailingDescriptorFromErrorModal();
                var expected = cmp.find("containedCmp").getDef().getDescriptor().getQualifiedName();

                $A.test.assertEquals(expected, actual);
            }
        ]
    },

    /**
     * Verify that failing descriptor is the source of original error when error from nested getCallback
     * functions.
     * The test approach is that call a client action to trigger a function wrapped by $A.getCallback, which
     * trigger another a funtion wrapped by $A.getCallback via aura:method. The actual error is from the latter
     * function, so the failing descriptor is the owner component of that function, which is the contained
     * component (markup://auratest:errorHandling).
     */
    testFailingDescriptorForErrorFromNestedGetCallbackFunctions: {
        test: [
            function(cmp) {
                $A.test.expectAuraError("Error from function wrapped in getCallback in component");
                var action = cmp.get("c.throwErrorFromNestedGetCallbackFunctions");
                $A.enqueueAction(action);
                this.waitForErrorModal();
            },
            function(cmp) {
                var actual = this.findFailingDescriptorFromErrorModal();
                var expected = cmp.find("containedCmp").getDef().getDescriptor().getQualifiedName();

                $A.test.assertEquals(expected, actual);
            }

        ]
    },

    waitForErrorModal: function() {
        $A.test.addWaitForWithFailureMessage(true,
            function(){
                var element = document.getElementById('auraError');
                var style = $A.test.getStyle(element, 'display');
                return style === 'block';
            },
            "Error Model didn't show up.");
    },

    /**
     * This function doesn't check if error modal exist. If expected error is from async
     * code, using waitForErrorModal() to guarantee error modal is shown.
     */
    findFailingDescriptorFromErrorModal: function() {
        var errorMsg = $A.test.getText(document.getElementById('auraErrorMessage'));
        if(!errorMsg) {
            $A.test.fail("Failed to find error message.");
        }
        var matches = errorMsg.match(/^Failing descriptor: \{(.*)\}$/m);
        if(!matches) {
            $A.test.fail("Failed to find Failing Descriptor from error message: " + errorMsg);
        }
        var failingDescriptor = matches[1];
        return failingDescriptor;
    }

})
