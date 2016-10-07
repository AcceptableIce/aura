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
    init : function(cmp, evt, helper) {
        helper.updateDisabled(cmp);
    },
	trigger : function(cmp) {
		// TODO: Checks to make sure we can retrieve a value here.
		var outputCmp = cmp.get("v.body")[0];
		
		if (outputCmp) {
			var value = outputCmp.get("v." + cmp.get("v.valueAttribute")),
			targetElement = cmp.getElement().parentNode;
		    
		    // Added targetRowIndex and targetCellIndex to access targetElement IF the initial target element does not exist in the DOM
		    // This can happen when the row is updated and the DOM is changed.
		    cmp.getEvent("gridAction").setParams({
                action : "edit",
                payload : {
					targetElement : targetElement,
					targetCellIndex : targetElement.cellIndex,
					targetRowIndex : targetElement.parentNode.rowIndex,
                    name : cmp.get("v.name"),
                    errors : cmp.get("v.errors"),
                    value : value
                }
            }).fire();
		}
	}
})// eslint-disable-line semi