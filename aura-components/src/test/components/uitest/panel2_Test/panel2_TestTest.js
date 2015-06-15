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
 * WITHOUT WARRANTIES OR CONDITIOloNS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
({
    browsers: ["-IE7","-IE8", "-IPHONE", "-IPAD", "-ANDROID_PHONE", "-ANDROID_TABLET"],
    
    /**
     * Test to verify first inputElement is focused
     */
    testModalFocusOnFirstInput: {
    	test: [function(cmp) {
    		this.createPanel(cmp);
        }, function(cmp) {
        	$A.test.addWaitForWithFailureMessage(true, function() {
                var activeElement = $A.test.getActiveElement();
                return $A.util.hasClass(activeElement, "inputPanelTypeClass");
            }, "First input element should be focused.");
        }]
    },
    
    /**
     * Verify First input is focused when autoFocus is set
     * Test case for W-2643030
     */
    testPanelFocusOnFirstInput: {
    	attributes : {"testPanelType" : "panel"},
    	test: [function(cmp) {
    		this.createPanel(cmp);
        }, function(cmp) {
        	$A.test.addWaitForWithFailureMessage(true, function() {
                var activeElement = $A.test.getActiveElement();
                return $A.util.hasClass(activeElement, "inputPanelTypeClass");
            }, "First input element should be focused.");
        }]
    },
  
    /**
     * Test to verify ESC button is focused when autoFocus is set to false
     * Revisit once Bug: W-2617212 is fixed
     */
    testPanelNotFocusedOnFirstInputWithAutoFocusOff: {
    	attributes : {"testAutoFocus" : false},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		$A.test.addWaitForWithFailureMessage(true, function() {
                var activeElement = $A.test.getActiveElement();
                return $A.util.hasClass(activeElement, "closeBtn");
            }, "Esc button should be focused for Modal");
    	}]
    },
  
    /**
     * Test close button is not displayed on modal
     */
    testCloseButtonHiddenOnModal: {
    	attributes : {"testShowCloseButton" : false},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		this.verifyElementWithClassPresent("closeBtn", false, "Close button present when it should not be");
    	}]
    },
    
    /**
     * Test close button is not displayed on panel
     */
    testCloseButtonHiddenOnPanelDialog: {
    	attributes : {"testPanelType" : "panel", "testShowCloseButton" : false},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForPanelDialogOpen();
    	}, function(cmp) {
    		this.verifyElementWithClassPresent("closeBtn", false, "Close button present when it should not be");
    	}]
    },
    
    /**
     * Test panel dialog takes up full screen
     */
    testPanelDialogFullScreen: {
    	attributes : {"testPanelType" : "panel", "testFlavor" : "full-screen"},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForPanelDialogOpen();
    	}, function(cmp) {
    		this.verifyElementWithClassPresent("uiPanel--full-screen", true, "Panel dialog should be full screen"); 
    	}]
    },
    
    /**
     * Test large modal type
     */
    testModalLarge: {
    	attributes : {"testFlavor" : "large"},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		this.verifyElementWithClassPresent("uiModal--large", true, "Modal should be of type large"); 
    	}]
    },
    
    /**
     * Test open multiple panel modals
     */
    testOpenMultipleModals: {
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		var testerCmp = this.getPanelTesterComponent(cmp.find("tester"));
    		modal1GlobalId = this.getGlobalIdForPanelModal(1);
    		var modal1VisibleAttrValue = $A.getCmp(modal1GlobalId).get("v.visible");
//    		Uncomment Me once bug W-2619412 fixed
//    		$A.test.assertTrue(modal1VisibleAttrValue, "Visible Attribute should be set for new modal opened");
    		
    		testerCmp.set("v.useHeader","true");
    		testerCmp.set("v.useFooter","true");
    		testerCmp.find("createPanelBtn").get("e.press").fire();
    	}, function(cmp) {
    		test = this.getPanelTesterComponent(cmp.find("tester"))
    		this.waitForNumberOfPanels("modal", 2);
    	}, function(cmp) {
    		var modal2GlobalId = this.getGlobalIdForPanelModal(2);
    		var modal2VisibleAttrValue = $A.getCmp(modal2GlobalId).get("v.visible");
    		var modal1VisibleAttrValue = $A.getCmp(modal1GlobalId).get("v.visible");
    		
//    		Uncomment Me once bug W-2619412 fixed
//    		$A.test.assertFalse(modal1VisibleAttrValue, "Visible Attribute should not be set for old modal opened");
//    		$A.test.assertTrue(modal2VisibleAttrValue, "Visible Attribute should be set for new modal opened");
    		
    		this.verifyElementWithClassPresent("defaultCustomPanelHeader", true, 
			"Custom panel header should be present for second modal");
    		this.verifyElementWithClassPresent("defaultCustomPanelFooter", true, 
			"Custom panel footer should be present for second modal");
    	}]
    },
    
    /**
     * Test close modal with multiple modals closes top most modal
     */
    testCloseModalWithMulitpleModals: {
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		// second modal
    		var panelTesterCmp = this.getPanelTesterComponent(cmp.find("tester"));
    		panelTesterCmp.find("createPanelBtn").get("e.press").fire();
    	}, function(cmp) {
    		this.waitForNumberOfPanels("modal", 2);
    	}, function(cmp) {
    		this.closePanel(cmp);
    	}, function(cmp) {
    		this.waitForNumberOfPanels("modal", 1);
    	}]
    },
    
    /**
     * Test open multiple modal and panels 
     * And closing them should close top most panel/modal
     */
    testCloseMulitpleModalPanels: {
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		// second panel
    		var panelTesterCmp = this.getPanelTesterComponent(cmp.find("tester"));
    		panelTesterCmp.set("v.panelType","panel");
    		panelTesterCmp.set("v.flavor","full-screen");
    		panelTesterCmp.find("createPanelBtn").get("e.press").fire();
    	}, function(cmp) {
    		this.waitForNumberOfPanels("panel", 1);
    		this.waitForNumberOfPanels("modal", 1);
        }, function(cmp) {
    		this.closePanel(cmp);
    	}, function(cmp) {
    		this.waitForModalClose();
    	}, function(cmp) {
    		this.waitForNumberOfPanels("panel", 1);
    	}]
    },
    
    /**
     * Test title hidden
     */
    testTitleHidden: {
    	attributes : {"testDisplayTitle" : false},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		var header = cmp.find("tester")._panel.getElement().getElementsByTagName("h2")[0];
    		$A.test.assertFalse($A.util.hasClass(header, "title"), "Title shold be hidden");
    	}]
    },
    
    /**
     * Test modal panel invisible
     */
    testModalHidden: {
    	attributes : {"testIsVisible" : false},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		var modal = $A.test.getElementByClass("uiModal");
    		$A.test.assertFalse($A.util.hasClass(modal, "active"), "Modal panel shold be hidden");
    	}]
    },
    
    /**
     * Open 1st panel with visible set and then open 2nd panel with visible unset
     * Closing the 1st panel should not add active class to 2nd panel
     * Bug: W-2617288
     */
    testModalHiddenWithMultipleVisibleModal: {
    	attributes : {"testIsVisible" : false},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		var panelTesterCmp = this.getPanelTesterComponent(cmp.find("tester"));
    		panelTesterCmp.set("v.isVisible","true");
    		panelTesterCmp.find("createPanelBtn").get("e.press").fire();
    	}, function(cmp) {
    		this.closePanel(cmp, "Close", 2);
    	}, function(cmp) {
    		var modal = $A.test.getElementByClass("uiModal")[0];
    		$A.test.addWaitForWithFailureMessage(false, function(){return $A.util.hasClass(modal,"active")}, "Modal panel shold be hidden");
		}]
    },
    
    /**
     * Test panel dialog invisible
     */
    testPanelDialogHidden: {
    	attributes : {"testPanelType" : "panel", "testIsVisible" : false},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForPanelDialogOpen();
    	}, function(cmp) {
    		var panel = $A.test.getElementByClass("uiPanel");
    		$A.test.assertFalse($A.util.hasClass(panel, "active"), "Panel dialog shold be hidden");
    	}]
    },
    
    /**
     * Test custom header in Modal
     */
    testCustomHeaderInModal: {
    	attributes : {"testUseHeader" : true},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		this.verifyElementWithClassPresent("defaultCustomPanelHeader", true, 
    				"Custom panel header for modal should be present");
    	}]
    },
    
    /**
     * Test custom footer in Modal
     */
    testCustomFooterInModal: {
    	attributes : {"testUseFooter" : true},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		this.verifyElementWithClassPresent("defaultCustomPanelFooter", true, 
    				"Custom panel footer for modal should be present");
    	}]
    },
    
    /**
     * Test custom header in Panel Dialog
     */
    testCustomHeaderInPanelDialog: {
    	attributes : {"testPanelType" : "panel", "testUseHeader" : true},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForPanelDialogOpen();
    	}, function(cmp) {
    		this.verifyElementWithClassPresent("defaultCustomPanelHeader", true, 
    				"Custom panel header for panel dialog should be present");
    	}]
    },
    
    /**
     * Test custom footer in Panel Dialog
     */
    testCustomFooterInPanelDialog: {
    	attributes : {"testPanelType" : "panel", "testUseFooter" : true},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForPanelDialogOpen();
    	}, function(cmp) {
    		this.verifyElementWithClassPresent("defaultCustomPanelFooter", true, 
    				"Custom panel footer for panel dialog should be present");
    	}]
    },
    
    /**
     * Test close modal
     */
    testCloseModal: {
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		this.closePanel(cmp);
    	}, function(cmp) {
    		this.waitForModalClose();
    	}, function(cmp) {
    		var ModalIdcreated = $A.test.select(".IdCreated")[0];
    		var ModalIdDestroyed = $A.test.select(".IdDestroyed")[0];
    		$A.test.assertEquals($A.test.getText(ModalIdcreated), $A.test.getText(ModalIdDestroyed), "Modal is not destroyed correctly");
    	}]
    },
    
    /**
     * Test close panel dialog
     */
    testClosePanelDialog: {
    	attributes : {"testPanelType" : "panel"},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForPanelDialogOpen();
    	}, function(cmp) {
    		this.closePanel(cmp);
    	}, function(cmp) {
    		this.waitForPanelDialogClose();
    	}, function(cmp) {
    		var ModalIdcreated = $A.test.select(".IdCreated")[0];
    		var ModalIdDestroyed = $A.test.select(".IdDestroyed")[0];
    		$A.test.assertEquals($A.test.getText(ModalIdcreated), $A.test.getText(ModalIdDestroyed), "Panel is not destroyed correctly");
    	}]
    },
    
    /**
     * Test close modal with invalid animation
     * Bug: W-2614945
     */
    testCloseModalWithInvalidAnimation: {
    	attributes : {"testAnimation": "abc"},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForModalOpen();
    	}, function(cmp) {
    		this.closePanel(cmp);
    	}, function(cmp) {
    		this.waitForModalClose();
    	}, function(cmp) {
    		var ModalIdcreated = $A.test.select(".IdCreated")[0];
    		var ModalIdDestroyed = $A.test.select(".IdDestroyed")[0];
    		$A.test.assertEquals($A.test.getText(ModalIdcreated), $A.test.getText(ModalIdDestroyed), "Modal is not destroyed correctly");
    	}]
    },
    
    /**
     * Test close panel dialog with invalid animation
     * Bug: W-2614943
     */
    testClosePanelDialogWithInvalidAnimation: {
    	attributes : {"testPanelType" : "panel", "testAnimation": "abc"},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForPanelDialogOpen();
    	}, function(cmp) {
    		this.closePanel(cmp);
    	}, function(cmp) {
    		this.waitForPanelDialogClose();
    	}, function(cmp) {
    		var ModalIdcreated = $A.test.select(".IdCreated")[0];
    		var ModalIdDestroyed = $A.test.select(".IdDestroyed")[0];
    		$A.test.assertEquals($A.test.getText(ModalIdcreated), $A.test.getText(ModalIdDestroyed), "Panel is not destroyed correctly");
    	}]
    },
    
    /**
     * Test close panel dialog with custom close dialog label
     */
    testClosePanelDialogWithCloseDialogLabel: {
    	attributes : {"testPanelType" : "panel", "testCloseDialogLabel" : "CloseLabel"},
    	test: [function(cmp) {
    		this.createPanel(cmp);
    	}, function(cmp) {
    		this.waitForPanelDialogOpen();
    	}, function(cmp) {
    		this.closePanel(cmp, "CloseLabel");
    	}, function(cmp) {
    		this.waitForPanelDialogClose();
    	}]
    },
    
    verifyElementWithClassPresent : function(className, isPresent, errorMsg) {
    	var element = $A.test.getElementByClass(className);
    	var result = !$A.util.isUndefinedOrNull(element);
    	if (isPresent) {
    		$A.test.assertTrue(result, errorMsg);
    	} else {
    		$A.test.assertFalse(result, errorMsg);
    	}
    },
    
    getPanelTesterComponent : function(cmp) {
    	var panelRef = cmp._panel;
    	var panelBodyElem = panelRef.find("body").getElement();
    	var testerHtmlCmp = $A.componentService.getRenderingComponentForElement(panelBodyElem.lastChild);
    	return testerHtmlCmp.getAttributeValueProvider();
    },
    
    createPanel : function(cmp) {
    	cmp.find("tester").find("createPanelBtn").get("e.press").fire();
    },
    
    closePanel : function(cmp, closeDialogLabel, totalPanels) {
    	if($A.util.isUndefinedOrNull(closeDialogLabel)){
    		closeDialogLabel = "Close";
    	}
    	if($A.util.isUndefinedOrNull(totalPanels)){
    		totalPanels = 1;
    	}
    	var closeBtn = $A.test.getElementByClass("closeBtn")[totalPanels-1];
    	var actualLabel = $A.test.getElementAttributeValue(closeBtn,"title");
    	$A.test.assertEquals(closeDialogLabel, actualLabel, "Close Dialog Label is incorrect");
    	$A.test.clickOrTouch(closeBtn);
    },
    
    waitForPanelDialogOpen : function() {
    	this.waitForPanel("panel", true);
    },
    
    waitForPanelDialogClose : function() {
    	this.waitForPanel("panel", false);
    },
    
    waitForModalOpen : function() {
    	this.waitForPanel("modal", true);
    },
    
    waitForModalClose : function() {
    	this.waitForPanel("modal", false);
    },
    
    waitForNumberOfPanels : function(panelType, numPanels) {
    	this.waitForPanel(panelType, null, numPanels)
    },
    
    waitForPanel : function(type, isOpen, numItems) {
    	var panelType = type === "modal" ? "uiModal" : "uiPanel";
    	var expectedState = isOpen ? "open" : "closed";
    	
    	if (numItems) {
    		$A.test.addWaitForWithFailureMessage(numItems, function() {
				var panel = $A.test.getElementByClass(panelType);
				return $A.util.isUndefinedOrNull(panel) ? 0 : panel.length;
			}, "Number of panels expected is incorrect");
    	} else {
	    	$A.test.addWaitForWithFailureMessage(isOpen, function() {
				var panel = $A.test.getElementByClass(panelType);
				return !$A.util.isUndefinedOrNull(panel);
			}, "Panel was not " + expectedState);
    	}
    },
    
    getGlobalIdForPanelModal : function(panelNumber){
    	return $A.test.getText($A.test.select(".IdCreated")[panelNumber-1]);
    }
})
