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
    /**
     * Verify setting value attribute to '' blank.
     */
    testEmptyValue:{
        attributes : {value: ''},
        test: function(component){
            aura.test.assertEquals('', component.find("span").getElement().textContent, "When value is initialized to an empty string, nothing should be shown.");
        }
    },
    /**
     * positive test case: Verify outputText can display text.
     */
    testValue: {
        attributes : {value : 'Hello World!'},
        test: function(component){
            aura.test.assertEquals('Hello World!', component.find("span").getElement().textContent, "Value attribute not correct");
        }
    },
    /**
     * Verify that default direction of display is left to right.
     */
    testDefaultDirection:{
        attributes : {value : 'some text'},
        test:function(component){
            aura.test.assertEquals('ltr', component.getValue('{!v.dir}').getValue(), "Default direction should be left to right.");
        }
    },
    /**
     * Verify that direction on span element changes when 'dir' attribute is changed.
     */
    testDir: {
        attributes : {value: 'Hello World! You are welcome.', dir : 'rtl'},
        test: function(component){
            aura.test.assertEquals('rtl', component.find("span").getElement().dir, "Dir attribute not correct");
        }
    },
    /**
     * Verify displaying non string value.
     */
    testNonStringValue:{
        attributes: {value: 3.1415},
        test: function(component){
            aura.test.assertEquals('3.1415', component.find("span").getElement().textContent, "Failed to display string form of numeric value");
        }
    },
    /**
     * Verify displaying Empty spaces.
     */
    // W-1075402 https://gus.soma.salesforce.com/a07B0000000GCEAIA4
    _testTrimmingSpaces:{
        attributes: {value: '   '},
        test: function(component){
            aura.test.assertEquals('', component.find("span").getElement().textContent, "Failed to trim spaces");
        }
    },
    /**
     * Verify prefix and suffix trimming of space.
     */
    // W-1075402 https://gus.soma.salesforce.com/a07B0000000GCEAIA4
    _testTrimmingSpacesAtFrontAndEnd:{
        attributes: {value: '   foo '},
        test: function(component){
            aura.test.assertEquals('foo', component.find("span").getElement().textContent, "Failed to trim spaces");
        }
    },
    /**
     * Output text with linefeed.
     */
    testLineFeed:{
        attributes: {value: '\n'},
        test: function(component){
            aura.test.assertEquals('\n', component.find("span").getElement().textContent, "Failed to trim spaces");
        }
    },
    /**
     * Output text with linefeeds.
     */
    testLineFeeds:{
        attributes: {value: '\n1\n2\n'},
        test: function(component){
            aura.test.assertEquals('\n1\n2\n', component.find("span").getElement().textContent, "Failed to trim spaces");
        }
    },
    /**
     * Output text with carriage returns & linefeeds.  Carriage returns are output as \n by browser.
     */
    testCarriageReturnLineFeeds:{
        attributes: {value: '\r\na\r\nb\r\n'},
        test: function(component){
            aura.test.assertEquals('\r\na\r\nb\r\n', component.find("span").getElement().textContent, "Failed to trim spaces");
        }
    },
})
