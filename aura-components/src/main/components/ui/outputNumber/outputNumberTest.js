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
     * Positive test case: Assign Negative value for attribute 'value'.
     */
    testNegativeValue:{
        attributes: {value : -123},
        test: function(component){
            aura.test.assertEquals('-123', component.find('span').getElement().textContent, "Negative values not displayed correctly.");
        }
    },
    /**
     * Positive test case: Assign Positive value for attribute 'value'.
     */
    testValue: {
        attributes : {value : 123},
        test: function(component){
            aura.test.assertEquals('123', component.find('span').getElement().textContent, "Positive value attribute not correct");
        }
    },
    /**
     * Negative test case: Assign blank value for attribute 'value'.
     * Expect it to show nothing.
     */
    //TODO W-1066030
    _testEmptyStringValue: {
        attributes : {value : ''},
        test: function(component){
            aura.test.assertEquals('', component.find('span').getElement().textContent, "Expect to see an empty span.");
        }
    },
    /**
     * Negative test case:Verify providing non numeric value for Value attribute.
     */
    //TODO: W-967009
    _testNonNumericValue: {
        attributes : {value : 'foo'},
        test: function(component){
            aura.test.assertEquals('The value attribute must be assigned a numeric value', component.find('span').getElement().textContent, "Should have displayed an error message.");
        }
    },
    /**
     * Positive test case: Assign nothing to format value and verify default precision used to display decimal.
     */
    testDefaultDecimalPrecision: {
        attributes : {value : 123.450},
        test: function(component){
            aura.test.assertEquals('123.45', component.find('span').getElement().textContent, "Value not displayed as expected when format is not specified.");
        }
    },
    /**
     * Negative test case: Assign a blank value for attribute 'format'.
     */
    testEmptyStringFormat: {
        attributes : {value : 123.450, format : ''},
        test: function(component){
            aura.test.assertEquals('123.45', component.find('span').getElement().textContent, "Value not displayed as expected when format is a empty string.");
        }
    },
    /**
     * Negative test case: Assign an invalid format value for attribute 'format'.
     */
    //W-952705
    testInvalidFormat  : {
        attributes : {value : 123.450, format : ',,'},
        test: function(component){
            aura.test.assertEquals('Invalid format attribute', component.find('span').getElement().textContent, "Should have displayed an error message.");
        }
    },
    /**
     * Verify Rounding up of decimal part of value.
     */
    testFormat2DecimalPlaces_RoundUp: {
        attributes : {value : 3.1459, format : '.00'},
        test: function(component){
            aura.test.assertEquals('3.15', component.find('span').getElement().textContent, "Decimal part of value was not rounded up based on format.");
        }
    },
    /**
     * Verify Rounding down of decimal part of value.
     */
    testFormat2DecimalPlaces_RoundDown: {
        attributes : {value : 3.14159, format : '.00'},
        test: function(component){
            aura.test.assertEquals('3.14', component.find('span').getElement().textContent, "Decimal part of value was not rounded down based on format.");
        }
    },
    /**
     * Verify Rounding functionality when length of integer part is restricted by format.
     */
    testFormatDoesNotRestrictIntegerValue: {
        attributes : {value : 22.7, format : '0.0'},
        test: function(component){
            aura.test.assertEquals('22.7', component.find('span').getElement().textContent, "Should have displayed full value but was probably truncated.");
        }
    },
    /**
     * Verify that zeros are appended to decimal value to match format.
     */
    testAppendingZeroToMatchFormat: {
        attributes : {value : 22.7, format : '.000'},
        test: function(component){
            aura.test.assertEquals('22.700', component.find('span').getElement().textContent, "Should have appended two zeros to match format.");
        }
    },
    /**
     * Test big value.
     */
    //W-952715
    testBigDecimal:{
        attributes : {value : '1234567890123456789012345678901234567890.12', format : '.00'},
        test: function(component){
            aura.test.assertEquals('1234567890123456789012345678901234567890.12', component.find('span').getElement().textContent, "Unexpected value.");
        }
    }
})
