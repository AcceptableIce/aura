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

({ /* eslint-disable */
	//Exclude from Safari and IE since File() constructor is not supported
	browsers : [ "GOOGLECHROME", "FIREFOX"],
	
    JPG_FILE : {
        name : 'file.jpg',
        type : 'image/jpg',
        size : 3145728 // 3 Mb
    },
    PNG_FILE : {
        name : 'file.png',
        type : 'image/png',
        size : 6291456 // 6 Mb
    },
    TEXT_HTML : {
        name : 'file.html',
        type : 'text/html',
        size : 1048576 // 1 Mb
    },
    DROP_EVENT_1 : function () {
        var event =  new Event('drop',{ bubbles: true });
        // fake dataTransfer
        event.dataTransfer = {
            files : this.createFileList(this.JPG_FILE)
        };
        return event;
    },
    DROP_EVENT_2 : function () {
        var event =  new Event('drop',{ bubbles: true });
        // fake dataTransfer
        event.dataTransfer = {
            files : this.createFileList(this.JPG_FILE, this.PNG_FILE)
        };
        return event;
    },
    DROP_EVENT_3 : function () {
        var event =  new Event('drop',{ bubbles: true });
        // fake dataTransfer
        event.dataTransfer = {
            files : this.createFileList(this.TEXT_HTML)
        };
        return event;
    },
    DROP_BIG_FILE : function () {
        var event =  new Event('drop',{ bubbles: true });
        // fake dataTransfer
        event.dataTransfer = {
            files : this.createFileList(this.PNG_FILE)
        };
        return event;
    },
    fireDomEvent : function (elem, event) {
        elem.dispatchEvent(event);
    },
    createFileList : function () {
        // We can not create FilesList Object with javascript for security reasons
        // then we fake FilesList === array-like
        return [].slice.call(arguments).reduce(function (prev, file) {
            prev[prev.length] = new File(this.fakeSize(file.size),file.name, { type : file.type });
            prev.length++;
            return prev;
        }.bind(this), this.createArrayLike());
    },
    // This function is make approximate
    fakeSize : function (size) {
        var startSize = 0;
        var fileParts = [];
        var chunk = 1024;
        while (startSize < size) {
            chunk = startSize + chunk <= size ? chunk : size - startSize;
            startSize += chunk;
            fileParts.push(Array(chunk).join('a'));
        }
        return fileParts;
    },
    createArrayLike : function () {
        return Object.defineProperty({}, 'length', {
            enumerable: false,
            configurable : true,
            get : function () { return Object.keys(this).length; }
        });
    },
    testDropFilesOver : {
        attributes : { multiple : false, accept : 'image/jpg' },
        test : [
            function (cmp) {
                var elem = cmp.find('dropZone').getElement();
                this.fireDomEvent(elem,this.DROP_EVENT_1());
            },
            function (cmp) {
                var files = cmp.get('v.files');
                $A.test.assertEquals(1, files.length,'One files was dropped');
                $A.test.assertEquals('file.jpg', files[0].name,'The file name should be file.jpg');
            }

        ]
    },
    testDropMultipleAllowed :  {
        attributes : { multiple : true, accept : 'image/jpg,image/png' },
        test : [
            function (cmp) {
                var elem = cmp.find('dropZone').getElement();
                this.fireDomEvent(elem,this.DROP_EVENT_2());
            },
            function (cmp) {
                var files = cmp.get('v.files');
                $A.test.assertEquals(2, files.length,'Two files were dropped');
                $A.test.assertEquals('file.jpg', files[0].name,'The first file name should be file.jpg');
                $A.test.assertEquals('file.png', files[1].name,'The first file name should be file.jpg');
            }
        ]
    },
    testDropMultipleNotAllowed :  {
        attributes : { multiple : false, accept : 'image/jpg,image/png' },
        test : [
            // Drop multiples
            function (cmp) {
                var elem = cmp.find('dropZone').getElement();
                this.fireDomEvent(elem,this.DROP_EVENT_2());
            },
            // Should be null or undefined 'cause is not allowed
            function (cmp) {
                var files = cmp.get('v.files');
                $A.test.assertUndefinedOrNull(files,'Multiple drop are not allowed');
            },
            // Drop single file
            function (cmp) {
                var elem = cmp.find('dropZone').getElement();
                this.fireDomEvent(elem,this.DROP_EVENT_1());
            },
            // Allowed
            function (cmp) {
                var files = cmp.get('v.files');
                $A.test.assertEquals(1, files.length,'One files was dropped');
                $A.test.assertEquals('file.jpg', files[0].name,'The file name should be file.jpg');
            },
            // Drop Multiple again
            function (cmp) {
                var elem = cmp.find('dropZone').getElement();
                this.fireDomEvent(elem,this.DROP_EVENT_2());
            },
            // Value still the last accept drop
            function (cmp) {
                var files = cmp.get('v.files');
                $A.test.assertEquals(1, files.length,'One files was dropped');
                $A.test.assertEquals('file.jpg', files[0].name,'The file name should be file.jpg');
            }
        ]
    },
    testDropNotAcceptFiles : {
        attributes : { multiple : false, accept : 'image/jpg,image/png' },
        test : [
            function (cmp) {
                var elem = cmp.find('dropZone').getElement();
                this.fireDomEvent(elem,this.DROP_EVENT_3());
            },
            // Should be null or undefined 'cause is not allowed
            function (cmp) {
                var files = cmp.get('v.files');
                $A.test.assertUndefinedOrNull(files,'Multiple drop are not allowed');
            },
            // Drop single file
            function (cmp) {
                var elem = cmp.find('dropZone').getElement();
                this.fireDomEvent(elem,this.DROP_EVENT_1());
            },
            // Allowed
            function (cmp) {
                var files = cmp.get('v.files');
                $A.test.assertEquals(1, files.length,'One files was dropped');
                $A.test.assertEquals('file.jpg', files[0].name,'The file name should be file.jpg');
            }
        ]
    },
    testMaxSizeAllowed :  {
        // Allow until 5 Mb
        attributes : { multiple : true , accept : 'image/jpg,image/png', maxSizeAllowed :  5242880 },
        test : [
            function (cmp) {
                var elem = cmp.find('dropZone').getElement();
                this.fireDomEvent(elem,this.DROP_BIG_FILE());
            },
            // Should be null or undefined 'cause is not allowed
            function (cmp) {
                var files = cmp.get('v.files');
                $A.test.assertUndefinedOrNull(files,'Only support files with less than ',cmp.get('v.maxSizeAllowed'));
            },
            function (cmp) {
                var elem = cmp.find('dropZone').getElement();
                this.fireDomEvent(elem,this.DROP_EVENT_1());
            },
            function (cmp) {
                var files = cmp.get('v.files');
                $A.test.assertEquals(1, files.length,'One files was dropped with ',files[0].size);
                $A.test.assertEquals('file.jpg', files[0].name,'The file name should be file.jpg');
            }
        ]
    },
    testFormElementInside : {
        attributes : { includeFormElement : true },
        test : [
            function (cmp) {
                var formElementCollection = cmp.getElement().querySelectorAll('form');
                $A.test.assertEquals(1, formElementCollection.length,'Cmp should include a form element inside');
            }
        ]
    },
    testWithoutFormElementInside : {
        attributes : { includeFormElement : false },
        test : [
            function (cmp) {
                var formElementCollection = cmp.getElement().querySelectorAll('form');
                $A.test.assertEquals(0, formElementCollection.length,'Cmp should include a form element inside');
            }
        ]
    }
})
/* eslint-enable */