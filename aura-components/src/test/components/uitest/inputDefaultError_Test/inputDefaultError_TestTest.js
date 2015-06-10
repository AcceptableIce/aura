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
({
    ERROR_OUTPUT : "The wren, Earns his living, Noiselessly",

    /*************************************************************************************************************
     * HELPER FUNCTIONS
     ************************************************************************************************************/
    /**
     * Verify aria-describedby value on the input tags matches the ul of inputDefaultError
     */
    verifyAriaIdCorrect : function(ul, input){
        var ulId = $A.test.getElementAttributeValue(ul, "id");
        var inputId =  $A.test.getElementAttributeValue(input, "aria-describedby");

        $A.test.assertEquals(ulId, inputId, "Aria-describedby attribute on the input tag and the id from the ul do not match")
    },

    /**
     * Verify that the component actually is how we expect it to be
     */
    verifyInputDefaultStructure : function(input, ul, childrenLength){
         //Grab the uls children and verify that there are three
         var children = ul.children;
         $A.test.assertEquals(childrenLength, children.length, "The amount of children is incorrect");

       //Verify aria-describedby value on the input tags matches the ul of inputDefaultError
        this.verifyAriaIdCorrect(ul, input)
    },

    /**
     * Code that happens multiple places, fires, grabs necessary data, then validates
     */
    validateBasic : function(cmp, auraId){
        var ul = $A.test.getElementByClass("uiInputDefaultError")[0];
        var input = cmp.find(auraId).getElement();

        this.verifyInputDefaultStructure(input, ul, 3);
    },

    /**
     * Fire validation on component and verify that it is there
     */
    fireErrorValidation : function(butn, ulIsNotPresent){
        butn.getEvent("press").fire();
        $A.test.addWaitFor(ulIsNotPresent, function (){
            return $A.util.isUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"));
        });
    },
 /***********************************************************************************************************
  * HELPER FUNCTION END
  ************************************************************************************************************/

     //Testing that the input default component can still links up correctly when validated during the init.
    testInputDefaultDynamic : {
        attributes : {"caseToRender" : "dynamic"},
        test : [function(cmp) {
            $A.test.addWaitFor(false, function (){
                return $A.util.isUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"));
            });
        },function(cmp){
            var ul = $A.test.getElementByClass("uiInputDefaultError")[0];
            var input = $A.test.getElementByClass("class1");
            //Grabbing the original id (the first element created)
            var aId = $A.util.getElementAttributeValue(ul,"id");

            this.verifyInputDefaultStructure(input[0], ul, 1)
        }, function(cmp){
             //Validate the components
            this.fireErrorValidation(cmp.find("new_button"), false);
        }, function(cmp){
            var uls = $A.test.getElementByClass("uiInputDefaultError");
            var aId = $A.util.getElementAttributeValue(uls[0],"id");

            //Verify second dynamically created input works correctly
            var input = $A.test.getElementByClass("class2");
            this.verifyInputDefaultStructure(input[0], uls[1], 1);

        }]
    },
    
     /**
     * Verify that inputDefault error only shows up on the correct input that is broken, and that it has the correct values
     */
    testInputDefaultShowsWithOnlyOneItem : {
        attributes : {"caseToRender" : "default"},
        test : [function(cmp) {
            //Verify that there are no inputDefaultErrors or uls on the page
            $A.test.assertEquals(document.getElementsByTagName("ul").length, 0, "There should be no uls present")
        }, function(cmp){
            //Validate the components
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp){
            var chldsText = "",
            ul = null,
            chlds = null,
            i = 0;
            //There should only be on ul/inputDefaultError component on the page
            ul = $A.test.getElementByClass("uiInputDefaultError")[0];

            this.validateBasic(cmp,"defaultInvalid");

             //Grab the uls children and verify that there are three
            var chlds = ul.children;
            //Verify error messages are correct
            for(i = 0; i< chlds.length; i++){
                chldsText = $A.util.getText(chlds[i]);
                $A.test.assertTrue(this.ERROR_OUTPUT.indexOf(chldsText) > -1, "Error message that is present is incorrect");
            }
        }]
    },

    /**
     * Show inputDefault error then take it away, then put it back
     */
    testInputDefaultToggles : {
        browsers: ["-IE7"],
        attributes: {"caseToRender" : "default"},
        test : [function(cmp){
            //Validate the components
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp){
            this.validateBasic(cmp,"defaultInvalid");
        }, function(cmp){
            //Remove errors
            this.fireErrorValidation(cmp.find("validate"), true);
        }, function(cmp){
            //UL should no longer exist
            $A.test.assertUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"),
                    "There should not be an inputDefaultError on the page!");
            //Make the component have errors again
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp){
            this.validateBasic(cmp,"defaultInvalid");
        }]
    },

    testInputDefaultWorkWithErrorComponentAttribute : {
        attributes: {"caseToRender" : "customUsage"},
        test : [function(cmp) {
            //UL should not exist
            $A.test.assertUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"),
                    "There should not be an inputDefaultError on the page!");

            //Validate the components
            this.fireErrorValidation(cmp.find("validate"), false);
        },function(cmp){
            this.validateBasic(cmp,"customUsageInvalid");
        },function(cmp){
            //Validate the components
            this.fireErrorValidation(cmp.find("validate"), true);
        },function(cmp){
            //UL should no longer exist
            $A.test.assertUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"),
                    "There should not be an inputDefaultError on the page!");
        }]
    },
    
    testStaticCustomErrorComponentAttribute : {
        attributes: {"caseToRender" : "staticCustomError"},
        test : [function(cmp) {
            //UL should not exist
            $A.test.assertUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"),
                    "There should not be an uiInputDefaultError on the page!");

            // Set errors
            cmp.find("validate").getEvent("press").fire();
        }, function(cmp) {
            var thisComponent = cmp.find("staticCustomErrorInvalid");
            var errorComponent = thisComponent.get("v.errorComponent")[0];
            $A.test.assertEquals("markup://uitest:inputErrorComponent", errorComponent.getDef().getDescriptor().toString());
            this.validateBasic(cmp,"staticCustomErrorInvalid");
        }, function(cmp) {
            // Change errors
            cmp.validateInput([ { message : "updated" } ]);
        }, function(cmp) {
            var ul = $A.test.getElementByClass("uiInputDefaultError")[0];
            $A.test.assertEquals(1, ul.children.length);
            $A.test.assertEquals("updated", $A.test.getText(ul.children[0]));
        }, function(cmp) {
            // Clear errors
            this.fireErrorValidation(cmp.find("validate"), true);
        }, function(cmp) {
            //UL should not exist
            $A.test.assertUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"),
                    "There should not be an uiInputDefaultError on the page!");
        }]
    },

    // need to update ariaDescribedBy
    // This is "late-binding" the errorComponent attribute after input component instantiation
    _testSetCustomErrorComponentAttribute : {
        attributes: {"caseToRender" : "textArea"},
        test : [function(cmp) {
            //UL should not exist
            $A.test.assertUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"),
                    "There should not be an uiInputDefaultError on the page!");

            // Set errorComponent
            var thisComponent = cmp.find("textAreaInvalid");
            var created = false;
            $A.createComponent("uitest:inputErrorComponent", {}, function(errorCmp) {
                thisComponent.set("v.errorComponent", [errorCmp]);
                created = true;
            });
            $A.test.addWaitFor(true, function() {
                return created;
            });
        }, function(cmp) {
            // Set errors
            this.fireErrorValidation(cmp.find("validate"), false);
        },function(cmp){
            var thisComponent = cmp.find("textAreaInvalid");
            var errorComponent = thisComponent.get("v.errorComponent")[0];
            $A.test.assertEquals("markup://uitest:inputErrorComponent", errorComponent.getDef().getDescriptor().toString());
            this.validateBasic(cmp,"textAreaInvalid");
        }, function(cmp) {
            // Clear errors
            this.fireErrorValidation(cmp.find("validate"), true);
        }, function(cmp) {
            //UL should not exist
            $A.test.assertUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"),
                    "There should not be an uiInputDefaultError on the page!");
        }]
    },

    testClientCreatedCustomErrorComponentAttribute : {
        attributes: {"caseToRender" : "clientCreated"},
        test : [function(cmp) {
            var created = false;
            $A.createComponent("uitest:inputErrorComponent", {}, function(errorCmp) {
                $A.createComponent("ui:inputText", {
                    "errorComponent" : [ errorCmp ]
                }, function(inputCmp){
                    cmp.index("clientCreatedInvalid", inputCmp.getGlobalId());
                    var newBody = cmp.getSuper().get("v.body");
                    newBody.unshift(inputCmp);
                    cmp.set("v.body", newBody);
                    created = true;
                });
            });
            $A.test.addWaitFor(true, function() {
                return created;
            });
        }, function(cmp) {
            // Set errors
            this.fireErrorValidation(cmp.find("validate"), false);
        },function(cmp){
            var thisComponent = cmp.find("clientCreatedInvalid");
            var errorComponent = thisComponent.get("v.errorComponent")[0];
            $A.test.assertEquals("markup://uitest:inputErrorComponent", errorComponent.getDef().getDescriptor().toString());
            this.validateBasic(cmp,"clientCreatedInvalid");
        }, function(cmp) {
            // Clear errors
            this.fireErrorValidation(cmp.find("validate"), true);
        }, function(cmp) {
            //UL should not exist
            $A.test.assertUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"),
                    "There should not be an uiInputDefaultError on the page!");
        }]
    },

    // need to update ariaDescribedBy, and push errors to swapped cmp on rerender, but this is perhaps not a valid use case 
    // This is similar to the late-binding set case above, except the errorComponent has been "activated"
    _testSwapErrorComponentAttribute : {
        attributes: {"caseToRender" : "textArea"},
        test : [function(cmp) {
            // Set errors
            this.fireErrorValidation(cmp.find("validate"), false);
        },function(cmp){
            this.validateBasic(cmp,"textAreaInvalid");
        }, function(cmp) {
            // Swap errorComponent
            var thisComponent = cmp.find("textAreaInvalid");
            var created = false;
            $A.createComponent("uitest:inputErrorComponent", {}, function(errorCmp) {
                thisComponent.set("v.errorComponent", [errorCmp]);
                created = true;
            });
            $A.test.addWaitFor(true, function() {
                return created;
            });
        },function(cmp){
            var thisComponent = cmp.find("textAreaInvalid");
            var errorComponent = thisComponent.get("v.errorComponent")[0];
            $A.test.assertEquals("markup://uitest:inputErrorComponent", errorComponent.getDef().getDescriptor().toString());
            this.validateBasic(cmp,"textAreaInvalid"); // fails here, because errors not "copied" over
        }, function(cmp) {
            // Clear errors
            this.fireErrorValidation(cmp.find("validate"), true);
        }, function(cmp) {
            //UL should not exist
            $A.test.assertUndefinedOrNull($A.test.getElementByClass("uiInputDefaultError"),
                    "There should not be an uiInputDefaultError on the page!");
        }]
    },
    
    /**
     * All tests from here on down, test individual components and make sure that the connection is still present
     */

    testCmpWithInputSelect : {
        attributes: { "caseToRender" : "select"},
        test : [function(cmp) {
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp) {
            this.validateBasic(cmp,"selectInvalid");
        }]
    },

    testCmpWithInputText : {
        attributes: { "caseToRender" : "text"},
        test : [function(cmp) {
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp) {
            this.validateBasic(cmp,"textInvalid");
        }]
    },
    
    testCmpWithInputSearch : {
        attributes: { "caseToRender" : "search"},
        test : [function(cmp) {
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp) {
            this.validateBasic(cmp,"searchInvalid");
        }]
    },
    
    testCmpWithInputTextArea : {
        attributes: { "caseToRender" : "textArea"},
        test : [function(cmp) {
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp) {
            this.validateBasic(cmp,"textAreaInvalid");

        }]
    },
    
    testCmpWithInputDate : {
        attributes: { "caseToRender" : "date"},
        test : [function(cmp) {
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp) {
            this.validateBasic(cmp,"dateInvalid");
        }]
    },

    //This component is special because it has two inputDefaultErrors already on page
    testCmpWithInputDateTime : {
        attributes: { "caseToRender" : "dateTime"},
        test : [function(cmp) {
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp) {
            var ulArray = $A.test.getElementByClass("uiInputDefaultError");
            var input = cmp.find("dateTimeInvalid").getElement();
            var ul = [];

            for(var i = 0; i< ulArray.length; i++){
               if($A.util.getElementAttributeValue(ulArray[i], "class").indexOf("hide") < 0){
                   ul.push(ulArray[i]);
               }
            }

            this.verifyInputDefaultStructure(input, ul[0], 3);
        }]
    },
    
    testCmpWithInputRadio : {
        attributes: { "caseToRender" : "radio"},
        test : [function(cmp) {
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp) {
            this.validateBasic(cmp,"radioInvalid");
        }]
    },
    
    testCmpWithInputRange : {
        attributes: { "caseToRender" : "range"},
        test : [function(cmp) {
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp) {
            this.validateBasic(cmp,"rangeInvalid");
        }]
    },
    
    testCmpWithInputTextAreaForAutoComplete : {
        attributes: { "caseToRender" : "autoCompleteTextArea"},
        test : [function(cmp) {
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp) {
            this.validateBasic(cmp,"autoCompleteTextAreaInvalid");
        }]
    },
    
    testCmpWithInputTextForAutoComplete : {
        attributes: { "caseToRender" : "autoCompleteText"},
        test : [function(cmp) {
            this.fireErrorValidation(cmp.find("validate"), false);
        }, function(cmp) {
            this.validateBasic(cmp,"autoCompleteTextInvalid");
        }]
    }
})
