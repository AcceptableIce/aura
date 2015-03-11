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
    createComponents: function(component, toAdd, alterFunction, ignoreChanges) {

        // Add a few items to the end of the body
        var currentCount = component.find("content").get("v.body.length");
        var configs = [];
        for (var i = 1; i <= toAdd; i++) {
            configs.push({
                componentDef: { descriptor:"markup://renderingTest:renderCounter" },
                attributes: {
                    values: {
                        index: currentCount + i
                    }
                }
            });
        }

        $A.componentService.newComponentAsync(
            this,
            function(newCmp){
                this.changeBody(component, alterFunction, newCmp, ignoreChanges);
            },
            configs
        );
    },

    /**
     * Alter the content of a body using a callback.
     */
    changeBody: function(component, alterFunction, newCmp, ignoreChanges) {
        var content = component.find("content");
        var body = content.get("v.body");
        var newBody = alterFunction(body, newCmp);
        content.set("v.body", newBody, ignoreChanges);
    },

    /**
     * Check that all iFrames are done loading.
     */
    iframesLoaded: function() {
        var iframeList = document.getElementsByTagName("iframe");
        for(var i = 0; i < iframeList.length; i++) {
            var iframe = iframeList.item(i);
            var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDocument.readyState !== "complete") {
                return false;
            }
        }
        return true;
    },

    assertComponents: function(component, values, message) {
        $A.rerender(component);
        $A.test.addWaitFor(true,
            this.iframesLoaded,
            function() {

                var nodes = component.find("content").getElement().childNodes;
                $A.test.assertEquals(values.length, nodes.length, message + ": invalid component count");

                for (var n = 0; n < nodes.length; n++) {
                    //
                    // If only a number is given, we assume render=1, rerender=onload=1, unrender=0, onload=1
                    // which is the normal case (updating onload will cause a rerender).
                    //
                    var expected = "#" + values[n] + (values[n] > 0 ? " 1 1 0 1" : "");
                    var actual = $A.test.getText(nodes[n]).replace(/\t/g," ");
                    $A.test.assertEquals(expected, actual, message + ": invalid row #" + (n + 1) + "( " + expected + "vs " + actual + ")");
                }
            }
        );
    },

    testInitialState: {
        test: function(component) {
            this.assertComponents(component, [1,2,3,4], "Initial rendering");
        }
    },

    testAppendFour: {
        test: [
            function(component) {

                this.createComponents(component, 4, function(body, newCmp) {
                	return body.concat(newCmp);
                });
            },
            function(component) {
                this.assertComponents(component, [1,2,3,4,5,6,7,8], "Append 4 components");
            }
        ]
    },

    testAppendFourNoUpdate: {
        test: [
            function(component) {

                this.createComponents(component, 4, function(body, newCmp) {
                    return body.concat(newCmp);
                }, true); // No rerender
            },
            function(component) {
                this.assertComponents(component, [1,2,3,4], "Append 4 components, no update");
            }
        ]
    },

    testRerenderTwo: {
        test: [
            function(component) {
                this.changeBody(component, function(body) {
                    body[1].set("v.index", 5);
                    body[2].set("v.index", 6);
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [1,"5 1 2 0 1","6 1 2 0 1",4], "Rerender 2nd and 3rd components");
            }
        ]
    },

    testPrependFour: {
        test: [
            function(component) {

                this.createComponents(component, 4, function(body, newCmp) {
                    return newCmp.concat(body);
                });
            },
            function(component) {
                this.assertComponents(component, [5,6,7,8,1,2,3,4], "Prepend 4 components");
            }
        ]
    },

    testInsertFour: {
        test: [
            function(component) {
                this.createComponents(component, 4, function(body, newCmp) {
                    body.splice.apply(body,[2,0].concat(newCmp));
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [1,2,5,6,7,8,3,4], "Insert 4 components between 2nd and 3rd");
            }
        ]
    },

    testInsertFourWithOverlap: {
        test: [
            function(component) {
                this.createComponents(component, 4, function(body, newCmp) {
                    body.splice.apply(body,[1,2].concat(newCmp));
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [1,5,6,7,8,4], "Insert 4 components over 2nd and 3rd");
            }
        ]
    },

    testAppendOne: {
        test: [
            function(component) {
                this.createComponents(component, 1, function(body, newCmp) {
                    body.push(newCmp[0]);
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [1,2,3,4,5], "Append 1 component");
            }
        ]
    },

    testDeleteLast: {
        test: [
            function(component) {
                this.changeBody(component, function(body) {
                    body.pop();
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [1,2,3], "Delete last component");
            }
        ]
    },

    testPrependOne: {
        test: [
            function(component) {
                this.createComponents(component, 1, function(body, newCmp) {
                    body.unshift(newCmp[0]);
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [5,1,2,3,4], "Prepend 1 component");
            }
        ]
    },

    testDeleteFirst: {
        test: [
            function(component) {
                this.changeBody(component, function(body) {
                    body.shift();
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [2,3,4], "Delete first component");
            }
        ]
    },

    testInsertOne: {
        test: [
            function(component) {
                this.createComponents(component, 1, function(body, newCmp) {
                    body.splice(1, 0, newCmp[0]);
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [1,5,2,3,4], "Insert 1 component in 2nd");
            }
        ]
    },

    testDeleteOne: {
        test: [
            function(component) {
                this.changeBody(component, function(body) {
                    body.splice(1, 1);
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [1,3,4], "Delete 2nd component");
            }
        ]
    },

    testReplaceOne: {
        test: [
            function(component) {
                this.createComponents(component, 1, function(body, newCmp) {
                    body.splice(1, 1, newCmp[0]);
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [1,5,3,4], "Replace 2nd component");
            }
        ]
    },

    _testSwapEnds: {
        test: [
            function(component) {
                this.createComponents(component, 1, function(body, newCmp) {
                    return [
                        body[3],
                        body[1],
                        body[2],
                        body[0]
                    ];
                });
            },
            function(component) {
                this.assertComponents(component, [1,3,2,4], "Swapped 1st and 4rd components");
            }
        ]
    },

    _testSwapMiddleTwo: {
        test: [
            function(component) {
                this.createComponents(component, 1, function(body, newCmp) {
                    return [
                        body[0],
                        body[2],
                        body[1],
                        body[3]
                    ];
                });
            },
            function(component) {
                this.assertComponents(component, [1,3,2,4], "Swapped 2nd and 3rd components");
            }
        ]
    },

    _testSwapFirstTwo: {
        test: [
            function(component) {
                this.createComponents(component, 1, function(body, newCmp) {
                    return [
                        body[1],
                        body[0],
                        body[2],
                        body[3]
                    ];
                });
            },
            function(component) {
                this.assertComponents(component, [1,3,2,4], "Swapped 1st and 2nd components");
            }
        ]
    },

    _testSwapLastTwo: {
        test: [
            function(component) {
                this.createComponents(component, 1, function(body, newCmp) {
                    return [
                        body[0],
                        body[1],
                        body[3],
                        body[2]
                    ];
                });
            },
            function(component) {
                this.assertComponents(component, [1,3,2,4], "Swapped 3rd and 4th components");
            }
        ]
    },

    _testMultiChange: {
        test: [
            function(component) {
                this.createComponents(component, 1, function(body, newCmp) {
                    // insert in 4rd place
                    body.splice(3, 0, newCmp[0]);
                    // remove the second
                    body.splice(1, 1);
                    return body;
                });
            },
            function(component) {
                this.assertComponents(component, [1,3,5,4], "Insert 4rd, delete 2nd component");
            }
        ]
    }
})
