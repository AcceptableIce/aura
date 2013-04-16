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
    updateDefaultError : function(component, event, helper){
        var concreteCmp = component.getConcreteComponent();
        var value = concreteCmp.getValue("v.value");
        helper.setErrorComponent(component, value);
    },
    
    init: function(cmp) {
    	var	mode = $A.getContext().getMode(),
    		isIOS = $A.get("$Browser.isIOS");
    		
    	if ((mode === "SELENIUM" || mode === "SELENIUMDEBUG") && isIOS) {    		 
    		//change event does not fire in selenium mode, so default to blur event
    		//W-1564254
    		if (cmp.get('v.updateOn') === 'change') {    			
    			cmp.getAttributes().setValue("updateOn", "blur");
    		}
    	}     
    } 
})
