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
				myData : {
					id : i,
					name : "Name" + i,
					grade : i,
					linkLabel : "Link" + i,
					bloodtype : helper.BLOOD_TYPES[Math.floor(Math.random() * 3)],
					progress : Math.random(),
					dues : Math.random() * 100
				},
				status : {},
				errors : {}
			});
		}
		// empty row
		items[5].myData.name = '';
		items[5].myData.grade = '';
		items[5].myData.linkLabel = '';
		items[5].myData.bloodtype = '';
		items[5].myData.progress = '';
		items[5].myData.dues = '';
		
		// hack for testing picklist
		items[0].myData.bloodtype = 'A';
		items[0].myData.progress = 0.98;
        items[0].myData.dues = 1234.56;
		
		cmp.set("v.items", items);
		
		// Generate edit layouts:
		cmp.find("grid").set("v.editLayouts", helper.EDIT_LAYOUTS);
		
		cmp.find("grid").set("v.editPanelConfigs", helper.EDIT_PANEL_CONFIG);
	},
	
	appendItem : function(cmp, evt, helper) {
		var i = Math.floor(Math.random() * 100);
		cmp.find("grid").appendItems([
		    {
		    	myData : {
		    		id : i,
		    		name : "Name" + i,
		    		grade : i,
		    		bloodtype : helper.BLOOD_TYPES[Math.floor(Math.random() * 3)],
		    	},
		    	status : {},
		    	errors : {}
		    }
		]);
	},
	
	updateItem : function(cmp) {
	    var index = cmp.get('v.index');
	    index = index ? index : cmp.find('inputTxt').get('v.value');
	    
	    var item = {
	            myData : {
	                id : 999,
	                name : 'updated at ' + index,
	                grade : 999,
	                linkLabel : 'new link'
	            },
	            status : {},
	            errors : {},
	    }
	    
	    cmp.find('grid').updateItem(item, index);
	},
	
	onEdit : function(cmp, evt, helper) {
	    helper.updateLastEdited(cmp, evt.getParams());
	}
})// eslint-disable-line semi