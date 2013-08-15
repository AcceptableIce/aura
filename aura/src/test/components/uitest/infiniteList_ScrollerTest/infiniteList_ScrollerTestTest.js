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
    
    
   /*
    * Testing to make sure that when pullToRefresh and PullToShowMore are not present,
    * that there isn't a spacer div. This appears when the amount of data on the screen
    * does not fill out the scrollable area 
    */ 
   testNoPullToRefreshNoDivSpace: {
        test: function(cmp) {
            var scrlrDiv = cmp.find("scroller3").getElements()[1];
            var divChildren = scrlrDiv.children[0].children.length;
            $A.test.assertFalse(divChildren > 1, "There should not be children relating to a spacer");
        }
    },
    /*
     * Making sure that the spacer in the scrollable areas' size is greater than zero since the
     * amount of data does not take up all of the space in the scrollable area 
     */
    testDivSpacerSizeForFewItems: {
        test: function(cmp) {
            var scrlrDiv = cmp.find("scroller2").getElements()[1];
            var cssText = scrlrDiv.children[0].children[2].style.cssText;
            var height = cssText.match( /\d+/g )[0];
            $A.test.assertTrue(height > 0, "height should be greater than zero for spacing, since there is not enough information");
        }
    },
    /*
     * Making sure that the div padding in the scrollable area, when the amount of items takes 
     * up all of the space, is zero. i.e. if you can scroll you shouldn't have padding
     */
    testDivSpacerSizeForMaxItems: {
        test: function(cmp) {
            var scrlrDiv = cmp.find("scroller1").getElements()[1];
            var cssText = scrlrDiv.children[0].children[2].style.cssText;
            var height = cssText.match( /\d+/g );
            $A.test.assertTrue(height == 0, "height should be equal to zero, since there is more than enough information");
        }
    }
})