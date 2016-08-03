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
    browsers: ["-IE7","-IE8"],
    
    WIDTHS : {
        initialWidths  : [200, 400, 100, 50],
        smallerWidths  : [100, 300, 75, 50],
        smallestWidths : [50, 50, 50, 50]
    },
    
    COLUMNS : ["Id", "Name", "Grade", "Link", "Issue Date", "Passing", "Notes", "Modified", "Actions"],
    
    testHandlesExist : {
        test : function(cmp) {
            var grid = cmp.find("grid");
            var columns = grid.getElement().querySelector('th');
            
            for (var i=0; i<columns.length; i++) {
                $A.test.assertDefined(columns[i].querySelector('.handle'), "Column " + i + " doesn't have a handle.");
            }
        }
    }
})