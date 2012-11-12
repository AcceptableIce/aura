/*
 * Copyright (C) 2012 salesforce.com, inc.
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
    testEmpty: {
        attributes : {thang : ''},
        
        test: function(component){
        	this.whatItIs(component, "Empty string", false);
        	
        	// bug W-1427153
        	//Making sure that globalId for client side component ends with 'c'
            newCmp = $A.componentService.newComponent({
                "componentDef": "markup://ifTest:testIf"
            });
            var reg = /:c/; 
            aura.test.assertNotNull(newCmp.getGlobalId().match(reg),"GlobalId for clientSide cmp should be ending with c but it is " + newCmp.getGlobalId());
        }
    },
    
    testUndefined: {
        
        test: function(component){
            this.whatItIs(component, "Undefined", false);
        }
    },
    
    testTrue: {
        attributes : {thang : 'true'},
        
        test: function(component){
            this.whatItIs(component, "true", true);
            
        }
    },
    
    testFalse: {
        attributes : {thang : 'false'},
        
        test: function(component){
            this.whatItIs(component, "false", false);
            
        }
    },
    
    testLiterals: {
        
        test: function(component){
            aura.test.assertNull(aura.util.getElementByClass("itIsLiterallyFalse"), "Literal false didn't evaluate as false");
            aura.test.assertNotNull(aura.util.getElementByClass("itIsLiterallyNotFalse"), "Literal true evaluated as false");
        }
    },
    
    // bug W-1419175
    _testRerender: {
    	attributes : {thang : "true"},
        
        test: function(component){
            this.whatItIs(component, "Testing Renrender: true", true);
            component.getAttributes().setValue("thang", false);
            $A.rerender(component);
            this.whatItIs(component, "Testing Rerender: false", false);
        }
    },
    whatItIs : function(component, name, value){
        if (!value) {
            aura.test.assertNotNull(aura.util.getElementByClass("itIsFalse"), name+" didn't evaluate as false");
            aura.test.assertNull(aura.util.getElementByClass("itIsTrue"), name+" evaluated as true");
        }else{
            aura.test.assertNotNull(aura.util.getElementByClass("itIsTrue"), name+" didn't evaluate as true");
            aura.test.assertNull(aura.util.getElementByClass("itIsFalse"), name+" evaluated as false");
        }
    }
})