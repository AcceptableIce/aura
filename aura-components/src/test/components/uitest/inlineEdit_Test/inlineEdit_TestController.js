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
		var items = [];
		
		for (var i = 0; i < 10; i++) {
			items.push({
				data : {
					id : i,
					name : "Name" + i,
					grade : i
				},
				status : {},
				errors : {}
			});
		}
		
		cmp.set("v.items", items);
		
		// Generate edit layouts:
		cmp.find("grid").set("v.editLayouts", helper.EDIT_LAYOUTS);
	}
})// eslint-disable-line semi