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

function SecureIFrameElement(el, key) {
    "use strict";

    var o = ls_getFromCache(el, key);
    if (o) {
        return o;
    }

    function SecureIFrameContentWindow(w) {
    	var sicw = Object.create(null, {
            toString: {
                value: function() {
                    return "SecureIFrameContentWindow: " + w + "{ key: " + JSON.stringify(key) + " }";
                }
            }
        });

    	Object.defineProperties(sicw, {
            postMessage: SecureObject.createFilteredMethod(sicw, w, "postMessage")
    	});

    	return sicw;
    }

    o = Object.create(null, {
        toString: {
            value: function() {
                return "SecureIFrameElement: " + el + "{ key: " + JSON.stringify(key) + " }";
            }
        }
    });
    
    function validateAttributeName(name) {
		if (name.toLowerCase() === "srcdoc") {
			throw new $A.auraError("SecureIFrameElement does not permit setting the srcdoc attribute!");
		}    	
    }

    Object.defineProperties(o, {
        // Standard HTMLElement methods
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement#Methods
        blur: SecureObject.createFilteredMethod(o, el, "blur"),
        focus: SecureObject.createFilteredMethod(o, el, "focus"),
        contentWindow: {
        	get: function() {
        		return SecureIFrameContentWindow(el.contentWindow);
        	}
        },
        setAttribute: {
        	value: function(name, value) {
        		validateAttributeName(name);
        		el.setAttribute(name, value);
        	}
        },
        setAttributeNS: {
        	value: function(namespace, name, value) {
        		validateAttributeName(name);
        		el.setAttributeNS(namespace, name, value);
        	}
        }
    });

    // Standard list of iframe's properties from:
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement
    // Note: ignoring 'contentDocument', 'sandbox' and 'srcdoc' from the list above.
    ["height", "width", "name", "src"].forEach(function (name) {
		Object.defineProperty(o, name, SecureObject.createFilteredProperty(o, el, name));
	});

    SecureObject.addPrototypeMethodsAndProperties(SecureElement.metadata, o, el, key);

    ls_setRef(o, el, key);
    ls_addToCache(el, o, key);

    return o;
}
