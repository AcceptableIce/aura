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
	EDIT_LAYOUTS : {
		id : {
			descriptor : 'markup://ui:inputNumber'
		},
		name : {
			descriptor : 'markup://ui:inputText'
		},
		grade : {
			descriptor : 'markup://ui:inputNumber'
		},
		date : {
			descriptor : 'markup://ui:inputDate',
			attributes : {
				displayDatePicker : true
			}
		}
	},
	
	generateItems : function() {
		var items = [];
		
		for (var i = 0; i < 10; i++) {
			items.push({
				id : i,
				name : "Name" + i,
				grade : i,
				date : "2016-3-" + (i + 1),
				status : {},
				errors : {}
			});
		}
		
		return items;
	}
})// eslint-disable-line semi