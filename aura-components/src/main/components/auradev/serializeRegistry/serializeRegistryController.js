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
    serialize: function(cmp) {
        var serializeBtn = cmp.find("serializeBtn");
        serializeBtn.set("v.disabled", true);
    	var a = cmp.get("c.serializeComponentRegistryToJson");
    	a.setCallback(cmp, function(action){
    		var state = action.getState();
    	    serializeBtn.set("v.disabled", false);
    	    if(state === "SUCCESS"){
    	    	/*eslint-disable no-alert*/
    	    	alert("Registry Serialized to: "+action.getReturnValue());
    	    } else if(state === "INCOMPLETE" || state === "ERROR") {
    	    	throw new Error("Failed to get serializeComponentRegistryToJson from server: "+action.getError());
            } 
        });
        $A.enqueueAction(a);
    }
})// eslint-disable-line semi
