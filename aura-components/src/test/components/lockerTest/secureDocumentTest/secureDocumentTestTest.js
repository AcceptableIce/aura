({
    /**
     * Note that this test file operates in system mode (objects are not Lockerized) so the tests delegate logic and
     * verification to the controller and helper files, which operate in user mode.
     */

    setUp: function(cmp) {
        cmp.set("v.testUtils", $A.test);
    },

    testCreateDocumentFragmentReturnsSecureElement: {
        test: function(cmp) {
            cmp.testCreateDocumentFragmentReturnsSecureElement();
        }
    },

    testCreateScriptElementReturnsSecureScript: {
        test: function(cmp) {
            cmp.testCreateScriptElementReturnsSecureScript();
        }
    },

    testCreateIframeElementReturnsSecureIframeElement: {
        test: function(cmp) {
            cmp.testCreateIframeElementReturnsSecureIframeElement();
        }
    },

    testCreateTextNodeReturnsSecureElement: {
        test: function(cmp) {
            cmp.testCreateTextNodeReturnsSecureElement();
        }
    },

    testCreateElementsAndPushToMarkup: {
        test: function(cmp) {
            cmp.testCreateElementsAndPushToMarkup();
        }
    },

    testGetElementByIdReturnsSecureElement: {
        test: function(cmp) {
            cmp.testGetElementByIdReturnsSecureElement();
        }
    },

    testQuerySelectorReturnsSecureElement: {
        test: function(cmp) {
            cmp.testQuerySelectorReturnsSecureElement();
        }
    },

    testSecureDocumentCookie: {
        test: function(cmp) {
            cmp.testSecureDocumentCookie(document.cookie);
        }
    },

    testDocumentTitle: {
        test: function(cmp) {
            cmp.testDocumentTitle();
            // Verify title is set in system-mode
            $A.test.assertEquals("secureDocumentTest", document.title);
        }
    },
    
    testQuerySelectorAllReturnsSecureNodeList: {
        test: function(cmp) {
            cmp.testQuerySelectorAllReturnsSecureNodeList();
        }
    }
})