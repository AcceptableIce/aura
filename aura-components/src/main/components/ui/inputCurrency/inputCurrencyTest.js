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
     * Pass nothing to component
     */
    testUnassigned: {
        test: function (component) {
            this.assertCmpElemValues(component, undefined, "");
        }
    },

    /*
     * Test 0 to catch if(number) bug
     */
    testZero: {
        attributes: {value: 0},
        test: function (component) {
            this.assertCmpElemValues(component, 0, "$0.00");
        }
    },

    /*
     * Test integer value
     */
    testIntegerCurrency: {
        attributes: {value: 12345},
        test: function (component) {
            this.assertCmpElemValues(component, 12345, "$12,345.00");
        }
    },

    /*
     * Test decimal value
     */
    testDecimalCurrency: {
        attributes: {value: 12345.67},
        test: function (component) {
            this.assertCmpElemValues(component, 12345.67, "$12,345.67");
        }
    },
    
    /*
     * Test negative value
     */
    testNegativeCurrency: {
        attributes: {value: -123},
        test: function (component) {
            this.assertCmpElemValues(component, -123, "-$123.00");
        }
    },

    /**
     * Test currency formatted correctly.
     */
    testDefaultFormat: {
        attributes: {value: 1234},
        test: function (component) {
            this.assertCmpElemValues(component, 1234, "$1,234.00");
        }
    },
    
    /**
     * Test that the format is set by default
     */
    testDefaultFormat : {
    	test : function(component) {
    		var expectedFormat = "¤#,##0.00";
    		var format = component.get('v.format');
    		$A.test.assertEquals(expectedFormat, format, "The actual format did not match the expected format");
    	} 	
    },

    /**
     * Test passing invalid format. Expect to use default format.
     */
    testInvalidFormat: {
        attributes: {value: 1234, format: ',,'},
        test: function (component) {
            this.assertCmpElemValues(component, 1234, "$1,234.00");
        }
    },

    /**
     * Test currency formatted correctly with custom format.
     */
    testWithFormat: {
        attributes: {value: 1234.56, format: "$#,###.0000"},
        test: function (component) {
            this.assertCmpElemValues(component, 1234.56, "$1,234.5600");
        }
    },

    /*
     * Verify that when value is set to an invalid value,
     * internal v.value should be undefined
     * displayed value should be empty
     */
    testSetInvalidValue: {
        test: [function (component) {
            component.set('v.value', 'abc');
        }, function(component){
            this.assertCmpElemValues(component, undefined, "");
        }]
    },

    /*
     * Verify that when the value changes it is re-rendered with the new format
     */
    testUpdateValue: {
        attributes: {value: 1234, format: "$#,###.0000"},
        test: [function (component) {
            this.assertCmpElemValues(component, 1234, "$1,234.0000");
            component.set("v.value", 5678);
        }, function (component) {
            this.assertCmpElemValues(component, 5678, "$5,678.0000");
        }]
    },

    /**
     * Verify that when the format changes it is not re-rendered with the new format
     */
    testUpdateFormat: {
        attributes: {value: 1234, format: "@#,###.0000"},
        test: [function (component) {
            this.assertCmpElemValues(component, 1234, "@1,234.0000");
            component.set("v.format", '$#,###.00');
        }, function (component) {
            this.assertCmpElemValues(component, 1234, "@1,234.0000");
        }]
    },

    /*****************
     * Helpers
     *****************/
    // check component's internval v.value and displayed value on the input box
    assertCmpElemValues: function (component, expectedCmpVal, expectedElemVal) {
        $A.test.assertEquals(expectedCmpVal, component.get("v.value"));
        $A.test.assertEquals(expectedElemVal, component.getElement().value,
                "Element value is not displayed/formatted correctly.");
    }
})// eslint-disable-line semi
