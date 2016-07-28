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
    },
    
    /** Resize events don't fire anymore if the resize is manually triggered by the user.
     *  // TODO: refacor the test
     *  Sshould check if the event fires when the resize is done through the UI,
     *  orr if the DOM matches the data passed in.
     */
    _testResizeEvent : {
        test : [function(cmp) {
            cmp.find("grid").resizeColumns(this.WIDTHS.smallerWidths);
        }, function(cmp) {
            var prevResize = cmp.get("v.prevResize");
            var lastIndex = this.COLUMNS.length - 1;
            var columns = cmp.find("grid").getElement().querySelectorAll('th');
            
            $A.test.assertEquals(prevResize.src.label, this.COLUMNS[lastIndex], "Name of last resized column does not match");
            $A.test.assertEquals(prevResize.src.index, lastIndex, "Index of last resized column does not match");
            $A.test.assertEquals(prevResize.width, columns[lastIndex].clientWidth);
        }]
    }
})