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

function runIfRunnable(st) {
    var isRunnable = st.$run;
    if (isRunnable) {
        // special case for SecureScriptElement to execute without
        // insertion.
        st.$run();
    }
    return isRunnable;
}

function trustChildNodes(node) {
    var key = ls_getKey(node);

    var children = node.childNodes;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        ls_setKey(child, key);
        trustChildNodes(child);
    }
}

var KEY_TO_PROTOTYPES = typeof Map !== "undefined" ? new Map() : undefined;

function SecureElement(el, key) {
    "use strict";

    var o = ls_getFromCache(el, key);
    if (o) {
        return o;
    }

    // A secure element can have multiple forms, this block allows us to apply
    // some polymorphic behavior to SecureElement depending on the tagName
    var tagName = el.tagName && el.tagName.toUpperCase();
    switch (tagName) {
    case "FRAME":
        throw new $A.auraError("The deprecated FRAME element is not supported in LockerService!");

    case "IFRAME":
        return SecureIFrameElement(el, key);

    case "SCRIPT":
        return SecureScriptElement(el, key);
    }

    // SecureElement is it then!

    // Lazily create and cache tag name specific prototype
    switch (el.nodeType) {
    	case Node.TEXT_NODE:
    		tagName = "#text";
    		break;

    	case Node.DOCUMENT_FRAGMENT_NODE:
    		tagName = "#fragment";
    		break;
    }

    // Segregate prototypes by their locker
    var prototypes = KEY_TO_PROTOTYPES.get(key);
    if (!prototypes) {
    	prototypes = new Map();
    	KEY_TO_PROTOTYPES.set(key, prototypes);
    }

    var prototype = prototypes.get(tagName);
    if (!prototype) {
    	prototype = Object.create(null);

    	Object.defineProperties(prototype, {
			toString: {
				value: function() {
					var e = SecureObject.getRaw(this, prototype);
		            return "SecureElement: " + e + "{ key: " + JSON.stringify(ls_getKey(this)) + " }";
				}
			},

			appendChild : {
		        value : function(child) {
		            if (!runIfRunnable(child)) {
		    			var e = SecureObject.getRaw(this, prototype);
		                e.appendChild(ls_getRef(child, ls_getKey(this), true));
		            }

		            return child;
		        }
		    },

		    replaceChild : {
		        value : function(newChild, oldChild) {
		            if (!runIfRunnable(newChild)) {
		    			var e = SecureObject.getRaw(this, prototype);
		            	var k = ls_getKey(this);
		                e.replaceChild(ls_getRef(newChild, k, true), ls_getRef(oldChild, k, true));
		            }

		            return oldChild;
		        }
		    },

		    insertBefore : {
		        value : function(newNode, referenceNode) {
		            if (!runIfRunnable(newNode)) {
		    			var e = SecureObject.getRaw(this, prototype);
		            	var k = ls_getKey(this);
		            	e.insertBefore(ls_getRef(newNode, k, true), referenceNode ? ls_getRef(referenceNode, k, true) : null);
		            }

		            return newNode;
		        }
		    },

		    querySelector: {
		        value: function(selector) {
					var e = SecureObject.getRaw(this, prototype);
		            return SecureElement.secureQuerySelector(e, ls_getKey(this), selector);
		        }
		    },

		    insertAdjacentHTML: {
		        value: function(position, text) {
					var e = SecureObject.getRaw(this, prototype);

		            // Do not allow insertAdjacentHTML on shared elements (body/head)
                    if (SecureElement.isSharedElement(el)) {
		                throw new $A.auraError("SecureElement.insertAdjacentHTML cannot be used with " + e.tagName + " elements!");
		            }

		            var parent;
		            if (position === "afterbegin" || position === "beforeend") {
		                // We have access to el, nothing else to check.
		            } else if (position === "beforebegin" || position === "afterend") {
		                // Prevent writing outside secure node.
		                parent = e.parentNode;
		                ls_verifyAccess(this, parent, true);
		            } else {
		                throw new $A.auraError("SecureElement.insertAdjacentHTML requires position 'beforeBegin', 'afterBegin', 'beforeEnd', or 'afterEnd'.");
		            }

		            // Allow SVG <use> element
		            var config = {
		                "ADD_TAGS" : [ "use" ]
		            };

		            e.insertAdjacentHTML(position, DOMPurify["sanitize"](text, config));

		            if (ls_getKey(this)) {
		                trustChildNodes(parent || e);
		            }
		        }
		    },

		    removeChild : SecureObject.createFilteredMethodStateless("removeChild", prototype, {
		        beforeCallback : function(child) {
		            // Verify that the passed in child is not opaque!
		            ls_verifyAccess(this, child, true);
		        }
		    }),

		    cloneNode : {
		        value : function(deep) {
		            function copyKeys(from, to) {
		            	// Copy keys from the original to the cloned tree
		                var fromKey = ls_getKey(from);
		                if (fromKey) {
		                	ls_setKey(to, fromKey);
		                }

		                var toChildren = to.childNodes;
		                var length = toChildren.length;
		                if (length > 0) {
		                    var fromChildren = from.childNodes;
		                    for (var i = 0; i < length; i++) {
		                        copyKeys(fromChildren[i], toChildren[i]);
		                    }
		                }
		            }

					var e = SecureObject.getRaw(this, prototype);
		            var root = e.cloneNode(deep);

		            // Maintain the same ownership in the cloned subtree
		            copyKeys(e, root);

		            return SecureElement(root, ls_getKey(this));
		        }
		    },

		    textContent : SecureObject.createFilteredPropertyStateless("textContent", prototype, {
		        afterGetCallback : function() {
		            return ls_getRef(this.cloneNode(true), ls_getKey(this)).textContent;
		        },
		        afterSetCallback : function() {
		            if (ls_getKey(this)) {
		    			var e = SecureObject.getRaw(this, prototype);
		                trustChildNodes(e);
		            }
		        }
		    })
    	});

    	prototypes.set(tagName, prototype);

        var prototypicalInstance = Object.create(prototype);
        ls_setRef(prototypicalInstance, el, key);

        var tagNameSpecificConfig = SecureObject.addPrototypeMethodsAndPropertiesStateless(SecureElement.metadata, prototypicalInstance, prototype);

        // Conditionally add things that not all Node types support
        if ("attributes" in el) {
	        tagNameSpecificConfig["attributes"] = SecureObject.createFilteredPropertyStateless("attributes", prototype, {
	            writable : false,
	            afterGetCallback : function(attributes) {
	                // Secure attributes
	                var secureAttributes = [];
	                for (var i = 0; i < attributes.length; i++) {
	                    var attribute = attributes[i];
	                    secureAttributes.push({
	                        name : attribute.name,
	                        value : SecureObject.filterEverything(this, attribute.value)
	                    });
	                }

	                return secureAttributes;
	            }
	        });
        }

        if ("innerText" in el) {
        	tagNameSpecificConfig["innerText"] = SecureObject.createFilteredPropertyStateless("innerText", prototype, {
	            afterGetCallback : function() {
	                return SecureObject.getRaw(this.cloneNode(true), prototype).innerText;
	            },
	            afterSetCallback : function() {
	                if (ls_getKey(this)) {
	                    trustChildNodes(el);
	                }
	            }
	        });
        }

        if ("innerHTML" in el) {
        	tagNameSpecificConfig["innerHTML"] = SecureObject.createFilteredPropertyStateless("innerHTML", prototype, {
	            afterGetCallback : function() {
	                return SecureObject.getRaw(this.cloneNode(true), prototype).innerHTML;
	            },
	            beforeSetCallback : function(value) {
	                // Do not allow innerHTML on shared elements (body/head)
	            	var raw = SecureObject.getRaw(this, prototype);
                    if (SecureElement.isSharedElement(el)) {
	                    throw new $A.auraError("SecureElement.innerHTML cannot be used with " + raw.tagName + " elements!");
	                }

	                // Allow SVG <use> element
	                var config = {
	                    "ADD_TAGS" : [ "use" ]
	                };

	                return DOMPurify["sanitize"](value, config);
	            },
	            afterSetCallback : function() {
	                if (ls_getKey(this)) {
	                	var raw = SecureObject.getRaw(this, prototype);
	                    trustChildNodes(raw);
	                }
	            }
	        });
        }

        // special handling for Text.splitText() instead of creating a new secure wrapper
		if (tagName === "#text" && "splitText" in el) {
			tagNameSpecificConfig["splitText"] = {
					value: function(index) {
						var raw = SecureObject.getRaw(this, prototype);
						var newNode = raw.splitText(index);

						var fromKey = ls_getKey(raw);
						if (fromKey) {
							ls_setKey(newNode, fromKey);
						}

						return SecureElement(newNode, ls_getKey(this));
					}
			};
		}

        SecureElement.createEventTargetMethodsStateless(tagNameSpecificConfig, prototype);
        
        Object.defineProperties(prototype, tagNameSpecificConfig);

        Object.freeze(prototype);
    }

    //o = Object.create(null, SECURE_ELEMENT_CONFIG);
    o = Object.create(prototype);

    ls_setRef(o, el, key);
    ls_addToCache(el, o, key);

    return o;
}

SecureElement.addEventTargetMethods = function(se, raw, key) {
    Object.defineProperties(se, {
        addEventListener : SecureElement.createAddEventListenerDescriptor(se, raw, key),
        dispatchEvent : SecureObject.createFilteredMethod(se, raw, "dispatchEvent"),

        // removeEventListener() is special in that we do not want to
        // unfilter/unwrap the listener argument or it will not match what
        // was actually wired up originally
        removeEventListener : {
            value : function(type, listener, options) {
                var sCallback = ls_getFromCache(listener, key);
                raw.removeEventListener(type, sCallback, options);
            }
        }
    });
};

SecureElement.createEventTargetMethodsStateless = function(config, prototype) {
	config["addEventListener"] = SecureElement.createAddEventListenerDescriptorStateless(prototype);

	config["dispatchEvent"] = SecureObject.createFilteredMethodStateless("dispatchEvent", prototype);

    // removeEventListener() is special in that we do not want to
    // unfilter/unwrap the listener argument or it will not match what
    // was actually wired up originally
	config["removeEventListener"] = {
        value : function(type, listener, options) {
        	var raw = SecureObject.getRaw(this, prototype);
            var sCallback = ls_getFromCache(listener, ls_getKey(this));
            raw.removeEventListener(type, sCallback, options);
        }
    };
};

SecureElement.createAddEventListenerDescriptor = function(st, el, key) {
    return {
        value : function(event, callback, useCapture) {
            if (!callback) {
                return; // by spec, missing callback argument does not throw,
                // just ignores it.
            }

            var sCallback = ls_getFromCache(callback, key);
            if (!sCallback) {
                sCallback = function(e) {
                    ls_verifyAccess(st, callback, true);
                    var se = SecureDOMEvent(e, key);
                    callback.call(st, se);
                };

                // Back reference for removeEventListener() support
                ls_addToCache(callback, sCallback, key);
                ls_setKey(callback, key);
            }

            el.addEventListener(event, sCallback, useCapture);
        }
    };
};

SecureElement.createAddEventListenerDescriptorStateless = function(prototype) {
    return {
        value : function(event, callback, useCapture) {
            if (!callback) {
                return; // by spec, missing callback argument does not throw,
                // just ignores it.
            }

            var so = this;
        	var el = SecureObject.getRaw(so, prototype);
        	var key = ls_getKey(so);
            var sCallback = ls_getFromCache(callback, key);
            if (!sCallback) {
                sCallback = function(e) {
                    ls_verifyAccess(so, callback, true);
                    var se = SecureDOMEvent(e, key);
                    callback.call(so, se);
                };

                // Back reference for removeEventListener() support
                ls_addToCache(callback, sCallback, key);
                ls_setKey(callback, key);
            }

            el.addEventListener(event, sCallback, useCapture);
        }
    };
};

SecureElement.createAddEventListener = function(st, el, key) {
    return function(event, callback, useCapture) {
        if (!callback) {
            return; // by spec, missing callback argument does not throw, just
            // ignores it.
        }

        var sCallback = function(e) {
            var se = SecureDOMEvent(e, key);
            callback.call(st, se);
        };

        el.addEventListener(event, sCallback, useCapture);
    };
};

SecureElement.DEFAULT = {};
SecureElement.FUNCTION = { type: "function" };
SecureElement.FUNCTION_TRUST_RETURN_VALUE = { type: "function", trustReturnValue: true };
SecureElement.EVENT = { type: "@event" };
SecureElement.SKIP_OPAQUE = { skipOpaque: true};

var DEFAULT = SecureElement.DEFAULT;
var FUNCTION = SecureElement.FUNCTION;
var FUNCTION_TRUST_RETURN_VALUE = SecureElement.FUNCTION_TRUST_RETURN_VALUE;
var EVENT = SecureElement.EVENT;
var SKIP_OPAQUE = SecureElement.SKIP_OPAQUE;

SecureElement.nodeMetadata = {
    "ATTRIBUTE_NODE":                 DEFAULT,
    "CDATA_SECTION_NODE":             DEFAULT,
    "COMMENT_NODE":                   DEFAULT,
    "DOCUMENT_FRAGMENT_NODE":         DEFAULT,
    "DOCUMENT_NODE":                  DEFAULT,
    "DOCUMENT_POSITION_CONTAINED_BY": DEFAULT,
    "DOCUMENT_POSITION_CONTAINS":     DEFAULT,
    "DOCUMENT_POSITION_DISCONNECTED": DEFAULT,
    "DOCUMENT_POSITION_FOLLOWING":    DEFAULT,
    "DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC": DEFAULT,
    "DOCUMENT_POSITION_PRECEDING":    DEFAULT,
    "DOCUMENT_TYPE_NODE":             DEFAULT,
    "ELEMENT_NODE":                   DEFAULT,
    "ENTITY_NODE":                    DEFAULT,
    "ENTITY_REFERENCE_NODE":          DEFAULT,
    "NOTATION_NODE":                  DEFAULT,
    "PROCESSING_INSTRUCTION_NODE":    DEFAULT,
    "TEXT_NODE":                      DEFAULT,
    "appendChild":                    FUNCTION,
    "baseURI":                        DEFAULT,
    "childNodes":                     DEFAULT,
    "cloneNode":                      FUNCTION,
    "compareDocumentPosition":        FUNCTION,
    "contains":                       FUNCTION,
    "firstChild":                     SKIP_OPAQUE,
    "insertBefore":                   FUNCTION,
    "isDefaultNamespace":             FUNCTION,
    "isEqualNode":                    FUNCTION,
    "isSameNode":                     FUNCTION,
    "lastChild":                      SKIP_OPAQUE,
    "lookupNamespaceURI":             FUNCTION,
    "lookupPrefix":                   FUNCTION,
    "nextSibling":                    SKIP_OPAQUE,
    "nodeName":                       DEFAULT,
    "nodeType":                       DEFAULT,
    "nodeValue":                      DEFAULT,
    "normalize":                      FUNCTION,
    "ownerDocument":                  DEFAULT,
    "parentElement":                  SKIP_OPAQUE,
    "parentNode":                     SKIP_OPAQUE,
    "previousSibling":                SKIP_OPAQUE,
    "removeChild":                    FUNCTION,
    "replaceChild":                   FUNCTION,
    "textContent":                    DEFAULT
};

SecureElement.eventTargetMetadata = {
    "addEventListener":               FUNCTION,
    "dispatchEvent":                  FUNCTION,
    "removeEventListener":            FUNCTION
};

SecureElement.metadata = {
	"prototypes": {
        "DocumentFragment" : {
            "childElementCount":              DEFAULT,
            "children":                       DEFAULT,
            "firstElementChild":              SKIP_OPAQUE,
            "getElementById":                 FUNCTION,
            "lastElementChild":               SKIP_OPAQUE,
            "querySelector":                  FUNCTION,
            "querySelectorAll":               FUNCTION
        },
	    "HTMLAnchorElement": {
	        "charset":                        DEFAULT,
	        "coords":                         DEFAULT,
	        "download":                       DEFAULT,
	        "hash":                           DEFAULT,
	        "host":                           DEFAULT,
	        "hostname":                       DEFAULT,
	        "href":                           DEFAULT,
	        "hreflang":                       DEFAULT,
	        "name":                           DEFAULT,
	        "origin":                         DEFAULT,
	        "password":                       DEFAULT,
	        "pathname":                       DEFAULT,
	        "ping":                           DEFAULT,
	        "port":                           DEFAULT,
	        "protocol":                       DEFAULT,
	        "referrerPolicy":                 DEFAULT,
	        "rel":                            DEFAULT,
	        "rev":                            DEFAULT,
	        "search":                         DEFAULT,
	        "shape":                          DEFAULT,
	        "target":                         DEFAULT,
	        "text":                           DEFAULT,
	        "type":                           DEFAULT,
	        "username":                       DEFAULT
	    },
	    "HTMLAreaElement": {
	        "alt":                            DEFAULT,
	        "coords":                         DEFAULT,
	        "hash":                           DEFAULT,
	        "host":                           DEFAULT,
	        "hostname":                       DEFAULT,
	        "href":                           DEFAULT,
	        "noHref":                         DEFAULT,
	        "origin":                         DEFAULT,
	        "password":                       DEFAULT,
	        "pathname":                       DEFAULT,
	        "ping":                           DEFAULT,
	        "port":                           DEFAULT,
	        "protocol":                       DEFAULT,
	        "referrerPolicy":                 DEFAULT,
	        "search":                         DEFAULT,
	        "shape":                          DEFAULT,
	        "target":                         DEFAULT,
	        "username":                       DEFAULT
	    },
	    "HTMLAudioElement": {
	    },
	    "HTMLMediaElement": {
	        "HAVE_CURRENT_DATA":              DEFAULT,
	        "HAVE_ENOUGH_DATA":               DEFAULT,
	        "HAVE_FUTURE_DATA":               DEFAULT,
	        "HAVE_METADATA":                  DEFAULT,
	        "HAVE_NOTHING":                   DEFAULT,
	        "NETWORK_EMPTY":                  DEFAULT,
	        "NETWORK_IDLE":                   DEFAULT,
	        "NETWORK_LOADING":                DEFAULT,
	        "NETWORK_NO_SOURCE":              DEFAULT,
	        "addTextTrack":                   FUNCTION,
	        "autoplay":                       DEFAULT,
	        "buffered":                       DEFAULT,
	        "canPlayType":                    FUNCTION,
	        "controls":                       DEFAULT,
	        "crossOrigin":                    DEFAULT,
	        "currentSrc":                     DEFAULT,
	        "currentTime":                    DEFAULT,
	        "defaultMuted":                   DEFAULT,
	        "defaultPlaybackRate":            DEFAULT,
	        "disableRemotePlayback":          DEFAULT,
	        "duration":                       DEFAULT,
	        "ended":                          DEFAULT,
	        "error":                          DEFAULT,
	        "load":                           FUNCTION,
	        "loop":                           DEFAULT,
	        "mediaKeys":                      DEFAULT,
	        "muted":                          DEFAULT,
	        "networkState":                   DEFAULT,
	        "onencrypted":                    EVENT,
	        "pause":                          FUNCTION,
	        "paused":                         DEFAULT,
	        "play":                           FUNCTION,
	        "playbackRate":                   DEFAULT,
	        "played":                         DEFAULT,
	        "preload":                        DEFAULT,
	        "readyState":                     DEFAULT,
	        "seekable":                       DEFAULT,
	        "seeking":                        DEFAULT,
	        "setMediaKeys":                   FUNCTION,
	        "setSinkId":                      FUNCTION,
	        "sinkId":                         DEFAULT,
	        "src":                            DEFAULT,
	        "textTracks":                     DEFAULT,
	        "volume":                         DEFAULT,
	        "webkitAudioDecodedByteCount":    DEFAULT,
	        "webkitVideoDecodedByteCount":    DEFAULT
	    },
	    "HTMLBaseElement": {
	        "href":                           DEFAULT,
	        "target":                         DEFAULT
	    },
	    "HTMLButtonElement": {
	        "autofocus":                      DEFAULT,
	        "checkValidity":                  FUNCTION,
	        "disabled":                       DEFAULT,
	        "form":                           DEFAULT,
	        "formAction":                     DEFAULT,
	        "formEnctype":                    DEFAULT,
	        "formMethod":                     DEFAULT,
	        "formNoValidate":                 DEFAULT,
	        "formTarget":                     DEFAULT,
	        "labels":                         DEFAULT,
	        "name":                           DEFAULT,
	        "reportValidity":                 FUNCTION,
	        "setCustomValidity":              FUNCTION,
	        "type":                           DEFAULT,
	        "validationMessage":              DEFAULT,
	        "validity":                       DEFAULT,
	        "value":                          DEFAULT,
	        "willValidate":                   DEFAULT
	    },
	    "HTMLCanvasElement": {
	        "captureStream":                  FUNCTION,
	        "getContext":                     FUNCTION,
	        "height":                         DEFAULT,
	        "toBlob":                         FUNCTION,
	        "toDataURL":                      FUNCTION,
	        "width":                          DEFAULT
	    },
	    "HTMLTableColElement": {
	        "align":                          DEFAULT,
	        "ch":                             DEFAULT,
	        "chOff":                          DEFAULT,
	        "span":                           DEFAULT,
	        "vAlign":                         DEFAULT,
	        "width":                          DEFAULT
	    },
	    "HTMLUnknownElement": {
	    },
	    "HTMLModElement": {
	        "cite":                           DEFAULT,
	        "dateTime":                       DEFAULT
	    },
	    "HTMLDetailsElement": {
	        "open":                           DEFAULT
	    },
	    "HTMLEmbedElement": {
	        "align":                          DEFAULT,
	        "getSVGDocument":                 FUNCTION,
	        "height":                         DEFAULT,
	        "name":                           DEFAULT,
	        "src":                            DEFAULT,
	        "type":                           DEFAULT,
	        "width":                          DEFAULT
	    },
	    "HTMLFieldSetElement": {
	        "checkValidity":                  FUNCTION,
	        "disabled":                       DEFAULT,
	        "elements":                       DEFAULT,
	        "form":                           DEFAULT,
	        "name":                           DEFAULT,
	        "reportValidity":                 FUNCTION,
	        "setCustomValidity":              FUNCTION,
	        "type":                           DEFAULT,
	        "validationMessage":              DEFAULT,
	        "validity":                       DEFAULT,
	        "willValidate":                   DEFAULT
	    },
	    "HTMLFormElement": {
	        "acceptCharset":                  DEFAULT,
	        "action":                         DEFAULT,
	        "autocomplete":                   DEFAULT,
	        "checkValidity":                  FUNCTION,
	        "elements":                       DEFAULT,
	        "encoding":                       DEFAULT,
	        "enctype":                        DEFAULT,
	        "length":                         DEFAULT,
	        "method":                         DEFAULT,
	        "name":                           DEFAULT,
	        "noValidate":                     DEFAULT,
	        "reportValidity":                 FUNCTION,
	        "requestAutocomplete":            FUNCTION,
	        "reset":                          FUNCTION,
	        "submit":                         FUNCTION,
	        "target":                         DEFAULT
	    },
	    "HTMLIFrameElement": {
            "align":                          DEFAULT,
            "allowFullscreen":                DEFAULT,
            "frameBorder":                    DEFAULT,
            "height":                         DEFAULT,
            "longDesc":                       DEFAULT,
            "marginHeight":                   DEFAULT,
            "marginWidth":                    DEFAULT,
            "name":                           DEFAULT,
            "referrerPolicy":                 DEFAULT,
            "scrolling":                      DEFAULT,
            "src":                            DEFAULT,
            "width":                          DEFAULT
        },
	    "HTMLImageElement": {
	        "align":                          DEFAULT,
	        "alt":                            DEFAULT,
	        "border":                         DEFAULT,
	        "complete":                       DEFAULT,
	        "crossOrigin":                    DEFAULT,
	        "currentSrc":                     DEFAULT,
	        "height":                         DEFAULT,
	        "hspace":                         DEFAULT,
	        "isMap":                          DEFAULT,
	        "longDesc":                       DEFAULT,
	        "lowsrc":                         DEFAULT,
	        "name":                           DEFAULT,
	        "naturalHeight":                  DEFAULT,
	        "naturalWidth":                   DEFAULT,
	        "referrerPolicy":                 DEFAULT,
	        "sizes":                          DEFAULT,
	        "src":                            DEFAULT,
	        "srcset":                         DEFAULT,
	        "useMap":                         DEFAULT,
	        "vspace":                         DEFAULT,
	        "width":                          DEFAULT,
	        "x":                              DEFAULT,
	        "y":                              DEFAULT
	    },
	    "HTMLInputElement": {
	        "accept":                         DEFAULT,
	        "align":                          DEFAULT,
	        "alt":                            DEFAULT,
	        "autocapitalize":                 DEFAULT,
	        "autocomplete":                   DEFAULT,
	        "autofocus":                      DEFAULT,
	        "checkValidity":                  FUNCTION,
	        "checked":                        DEFAULT,
	        "defaultChecked":                 DEFAULT,
	        "defaultValue":                   DEFAULT,
	        "dirName":                        DEFAULT,
	        "disabled":                       DEFAULT,
	        "files":                          DEFAULT,
	        "form":                           DEFAULT,
	        "formAction":                     DEFAULT,
	        "formEnctype":                    DEFAULT,
	        "formMethod":                     DEFAULT,
	        "formNoValidate":                 DEFAULT,
	        "formTarget":                     DEFAULT,
	        "height":                         DEFAULT,
	        "incremental":                    DEFAULT,
	        "indeterminate":                  DEFAULT,
	        "labels":                         DEFAULT,
	        "list":                           DEFAULT,
	        "max":                            DEFAULT,
	        "maxLength":                      DEFAULT,
	        "min":                            DEFAULT,
	        "minLength":                      DEFAULT,
	        "multiple":                       DEFAULT,
	        "name":                           DEFAULT,
	        "pattern":                        DEFAULT,
	        "placeholder":                    DEFAULT,
	        "readOnly":                       DEFAULT,
	        "reportValidity":                 FUNCTION,
	        "required":                       DEFAULT,
	        "select":                         FUNCTION,
	        "selectionDirection":             DEFAULT,
	        "selectionEnd":                   DEFAULT,
	        "selectionStart":                 DEFAULT,
	        "setCustomValidity":              FUNCTION,
	        "setRangeText":                   FUNCTION,
	        "setSelectionRange":              FUNCTION,
	        "size":                           DEFAULT,
	        "src":                            DEFAULT,
	        "step":                           DEFAULT,
	        "stepDown":                       FUNCTION,
	        "stepUp":                         FUNCTION,
	        "type":                           DEFAULT,
	        "useMap":                         DEFAULT,
	        "validationMessage":              DEFAULT,
	        "validity":                       DEFAULT,
	        "value":                          DEFAULT,
	        "valueAsDate":                    DEFAULT,
	        "valueAsNumber":                  DEFAULT,
	        "webkitEntries":                  DEFAULT,
	        "webkitdirectory":                DEFAULT,
	        "width":                          DEFAULT,
	        "willValidate":                   DEFAULT
	    },
	    "HTMLLabelElement": {
	        "control":                        DEFAULT,
	        "form":                           DEFAULT,
	        "htmlFor":                        DEFAULT
	    },
	    "HTMLLIElement": {
	        "type":                           DEFAULT,
	        "value":                          DEFAULT
	    },
	    "HTMLLinkElement": {
	        "as":                             DEFAULT,
	        "charset":                        DEFAULT,
	        "crossOrigin":                    DEFAULT,
	        "disabled":                       DEFAULT,
	        "href":                           DEFAULT,
	        "hreflang":                       DEFAULT,
	        "import":                         DEFAULT,
	        "integrity":                      DEFAULT,
	        "media":                          DEFAULT,
	        "rel":                            DEFAULT,
	        "relList":                        DEFAULT,
	        "rev":                            DEFAULT,
	        "sheet":                          DEFAULT,
	        "sizes":                          DEFAULT,
	        "target":                         DEFAULT,
	        "type":                           DEFAULT
	    },
	    "HTMLMapElement": {
	        "areas":                          DEFAULT,
	        "name":                           DEFAULT
	    },
	    "HTMLMetaElement": {
	        "content":                        DEFAULT,
	        "httpEquiv":                      DEFAULT,
	        "name":                           DEFAULT,
	        "scheme":                         DEFAULT
	    },
	    "HTMLMeterElement": {
	        "high":                           DEFAULT,
	        "labels":                         DEFAULT,
	        "low":                            DEFAULT,
	        "max":                            DEFAULT,
	        "min":                            DEFAULT,
	        "optimum":                        DEFAULT,
	        "value":                          DEFAULT
	    },
	    "HTMLObjectElement": {
	        "align":                          DEFAULT,
	        "archive":                        DEFAULT,
	        "border":                         DEFAULT,
	        "checkValidity":                  FUNCTION,
	        "code":                           DEFAULT,
	        "codeBase":                       DEFAULT,
	        "codeType":                       DEFAULT,
	        "contentDocument":                DEFAULT,
	        "data":                           DEFAULT,
	        "declare":                        DEFAULT,
	        "form":                           DEFAULT,
	        "getSVGDocument":                 FUNCTION,
	        "height":                         DEFAULT,
	        "hspace":                         DEFAULT,
	        "name":                           DEFAULT,
	        "reportValidity":                 FUNCTION,
	        "setCustomValidity":              FUNCTION,
	        "standby":                        DEFAULT,
	        "type":                           DEFAULT,
	        "useMap":                         DEFAULT,
	        "validationMessage":              DEFAULT,
	        "validity":                       DEFAULT,
	        "vspace":                         DEFAULT,
	        "width":                          DEFAULT,
	        "willValidate":                   DEFAULT
	    },
	    "HTMLOListElement": {
	        "compact":                        DEFAULT,
	        "reversed":                       DEFAULT,
	        "start":                          DEFAULT,
	        "type":                           DEFAULT
	    },
	    "HTMLOptGroupElement": {
	        "disabled":                       DEFAULT,
	        "label":                          DEFAULT
	    },
	    "HTMLOptionElement": {
	        "defaultSelected":                DEFAULT,
	        "disabled":                       DEFAULT,
	        "form":                           DEFAULT,
	        "index":                          DEFAULT,
	        "label":                          DEFAULT,
	        "selected":                       DEFAULT,
	        "text":                           DEFAULT,
	        "value":                          DEFAULT
	    },
	    "HTMLOutputElement": {
	        "checkValidity":                  FUNCTION,
	        "defaultValue":                   DEFAULT,
	        "form":                           DEFAULT,
	        "htmlFor":                        DEFAULT,
	        "labels":                         DEFAULT,
	        "name":                           DEFAULT,
	        "reportValidity":                 FUNCTION,
	        "setCustomValidity":              FUNCTION,
	        "type":                           DEFAULT,
	        "validationMessage":              DEFAULT,
	        "validity":                       DEFAULT,
	        "value":                          DEFAULT,
	        "willValidate":                   DEFAULT
	    },
	    "HTMLParamElement": {
	        "name":                           DEFAULT,
	        "type":                           DEFAULT,
	        "value":                          DEFAULT,
	        "valueType":                      DEFAULT
	    },
	    "HTMLProgressElement": {
	        "labels":                         DEFAULT,
	        "max":                            DEFAULT,
	        "position":                       DEFAULT,
	        "value":                          DEFAULT
	    },
	    "HTMLQuoteElement": {
	        "cite":                           DEFAULT
	    },
	    "HTMLSelectElement": {
	        "add":                            FUNCTION,
	        "autofocus":                      DEFAULT,
	        "checkValidity":                  FUNCTION,
	        "disabled":                       DEFAULT,
	        "form":                           DEFAULT,
	        "item":                           FUNCTION,
	        "labels":                         DEFAULT,
	        "length":                         DEFAULT,
	        "multiple":                       DEFAULT,
	        "name":                           DEFAULT,
	        "namedItem":                      FUNCTION,
	        "options":                        DEFAULT,
	        "remove":                         FUNCTION,
	        "reportValidity":                 FUNCTION,
	        "required":                       DEFAULT,
	        "selectedIndex":                  DEFAULT,
	        "selectedOptions":                DEFAULT,
	        "setCustomValidity":              FUNCTION,
	        "size":                           DEFAULT,
	        "type":                           DEFAULT,
	        "validationMessage":              DEFAULT,
	        "validity":                       DEFAULT,
	        "value":                          DEFAULT,
	        "willValidate":                   DEFAULT
	    },
	    "HTMLSourceElement": {
	        "media":                          DEFAULT,
	        "sizes":                          DEFAULT,
	        "src":                            DEFAULT,
	        "srcset":                         DEFAULT,
	        "type":                           DEFAULT
	    },
	    "HTMLTableCellElement": {
	        "abbr":                           DEFAULT,
	        "align":                          DEFAULT,
	        "axis":                           DEFAULT,
	        "bgColor":                        DEFAULT,
	        "cellIndex":                      DEFAULT,
	        "ch":                             DEFAULT,
	        "chOff":                          DEFAULT,
	        "colSpan":                        DEFAULT,
	        "headers":                        DEFAULT,
	        "height":                         DEFAULT,
	        "noWrap":                         DEFAULT,
	        "rowSpan":                        DEFAULT,
	        "scope":                          DEFAULT,
	        "vAlign":                         DEFAULT,
	        "width":                          DEFAULT
	    },
	    "HTMLTableElement": {
	    	"caption":                        DEFAULT,
	        "tHead":                          SKIP_OPAQUE,
	        "tFoot":                          SKIP_OPAQUE,
	        "tBodies":                        DEFAULT,
	        "createTHead":                    FUNCTION_TRUST_RETURN_VALUE,
	        "deleteTHead":                    FUNCTION,
	        "createTFoot":                    FUNCTION_TRUST_RETURN_VALUE,
	        "deleteTFoot":                    FUNCTION,
	        "createCaption":                  FUNCTION_TRUST_RETURN_VALUE,
	        "deleteCaption":                  FUNCTION,
	        "rows":                           DEFAULT,
	        "insertRow":                      FUNCTION_TRUST_RETURN_VALUE,
	        "deleteRow":                      FUNCTION  
        },
	    "HTMLTableRowElement": {
	        "cells":                          DEFAULT,
	        "rowIndex":                       DEFAULT,
	        "sectionRowIndex":                DEFAULT,
		    "insertCell":                     FUNCTION_TRUST_RETURN_VALUE,
	        "deleteCell":                     FUNCTION        
	    },
	    "HTMLTableSectionElement": {
	        "rows":                           DEFAULT,
	        "insertRow":                      FUNCTION_TRUST_RETURN_VALUE,
	        "deleteRow":                      FUNCTION     
	    },
	    "HTMLTemplateElement": {
	        "content":                        DEFAULT
	    },
	    "HTMLTextAreaElement": {
	        "autocapitalize":                 DEFAULT,
	        "autofocus":                      DEFAULT,
	        "checkValidity":                  FUNCTION,
	        "cols":                           DEFAULT,
	        "defaultValue":                   DEFAULT,
	        "dirName":                        DEFAULT,
	        "disabled":                       DEFAULT,
	        "form":                           DEFAULT,
	        "labels":                         DEFAULT,
	        "maxLength":                      DEFAULT,
	        "minLength":                      DEFAULT,
	        "name":                           DEFAULT,
	        "placeholder":                    DEFAULT,
	        "readOnly":                       DEFAULT,
	        "reportValidity":                 FUNCTION,
	        "required":                       DEFAULT,
	        "rows":                           DEFAULT,
	        "select":                         FUNCTION,
	        "selectionDirection":             DEFAULT,
	        "selectionEnd":                   DEFAULT,
	        "selectionStart":                 DEFAULT,
	        "setCustomValidity":              FUNCTION,
	        "setRangeText":                   FUNCTION,
	        "setSelectionRange":              FUNCTION,
	        "textLength":                     DEFAULT,
	        "type":                           DEFAULT,
	        "validationMessage":              DEFAULT,
	        "validity":                       DEFAULT,
	        "value":                          DEFAULT,
	        "willValidate":                   DEFAULT,
	        "wrap":                           DEFAULT
	    },
	    "HTMLTrackElement": {
	        "ERROR":                          DEFAULT,
	        "LOADED":                         DEFAULT,
	        "LOADING":                        DEFAULT,
	        "NONE":                           DEFAULT,
	        "default":                        DEFAULT,
	        "kind":                           DEFAULT,
	        "label":                          DEFAULT,
	        "readyState":                     DEFAULT,
	        "src":                            DEFAULT,
	        "srclang":                        DEFAULT,
	        "track":                          DEFAULT
	    },
	    "HTMLVideoElement": {
	        "height":                         DEFAULT,
	        "poster":                         DEFAULT,
	        "videoHeight":                    DEFAULT,
	        "videoWidth":                     DEFAULT,
	        "width":                          DEFAULT
	    },
	    "HTMLElement": {
	        "accessKey":                      DEFAULT,
	        "blur":                           FUNCTION,
	        "click":                          FUNCTION,
	        "contentEditable":                DEFAULT,
	        "dataset":                        DEFAULT,
	        "dir":                            DEFAULT,
	        "draggable":                      DEFAULT,
	        "focus":                          FUNCTION,
	        "hidden":                         DEFAULT,
	        "innerText":                      DEFAULT,
	        "isContentEditable":              DEFAULT,
	        "lang":                           DEFAULT,
	        "offsetHeight":                   DEFAULT,
	        "offsetLeft":                     DEFAULT,
	        "offsetParent":                   DEFAULT,
	        "offsetTop":                      DEFAULT,
	        "offsetWidth":                    DEFAULT,
	        "onabort":                        EVENT,
	        "onautocomplete":                 EVENT,
	        "onautocompleteerror":            EVENT,
	        "onblur":                         EVENT,
	        "oncancel":                       EVENT,
	        "oncanplay":                      EVENT,
	        "oncanplaythrough":               EVENT,
	        "onchange":                       EVENT,
	        "onclick":                        EVENT,
	        "onclose":                        EVENT,
	        "oncontextmenu":                  EVENT,
	        "oncuechange":                    EVENT,
	        "ondblclick":                     EVENT,
	        "ondrag":                         EVENT,
	        "ondragend":                      EVENT,
	        "ondragenter":                    EVENT,
	        "ondragleave":                    EVENT,
	        "ondragover":                     EVENT,
	        "ondragstart":                    EVENT,
	        "ondrop":                         EVENT,
	        "ondurationchange":               EVENT,
	        "onemptied":                      EVENT,
	        "onended":                        EVENT,
	        "onerror":                        EVENT,
	        "onfocus":                        EVENT,
	        "oninput":                        EVENT,
	        "oninvalid":                      EVENT,
	        "onkeydown":                      EVENT,
	        "onkeypress":                     EVENT,
	        "onkeyup":                        EVENT,
	        "onload":                         EVENT,
	        "onloadeddata":                   EVENT,
	        "onloadedmetadata":               EVENT,
	        "onloadstart":                    EVENT,
	        "onmousedown":                    EVENT,
	        "onmouseenter":                   EVENT,
	        "onmouseleave":                   EVENT,
	        "onmousemove":                    EVENT,
	        "onmouseout":                     EVENT,
	        "onmouseover":                    EVENT,
	        "onmouseup":                      EVENT,
	        "onmousewheel":                   EVENT,
	        "onpause":                        EVENT,
	        "onplay":                         EVENT,
	        "onplaying":                      EVENT,
	        "onprogress":                     EVENT,
	        "onratechange":                   EVENT,
	        "onreset":                        EVENT,
	        "onresize":                       EVENT,
	        "onscroll":                       EVENT,
	        "onseeked":                       EVENT,
	        "onseeking":                      EVENT,
	        "onselect":                       EVENT,
	        "onshow":                         EVENT,
	        "onstalled":                      EVENT,
	        "onsubmit":                       EVENT,
	        "onsuspend":                      EVENT,
	        "ontimeupdate":                   EVENT,
	        "ontoggle":                       EVENT,
	        "ontouchcancel":               	  EVENT,
	        "ontouchend":                	  EVENT,
	        "ontouchmove":                	  EVENT,
	        "ontouchstart":                	  EVENT,
	        "onvolumechange":                 EVENT,
	        "onwaiting":                      EVENT,
	        "outerText":                      DEFAULT,
	        "spellcheck":                     DEFAULT,
	        "style":                          DEFAULT,
	        "tabIndex":                       DEFAULT,
	        "title":                          DEFAULT,
	        "translate":                      DEFAULT,
	        "webkitdropzone":                 DEFAULT
	    },
	    "SVGElement": {
	    	"blur":							  FUNCTION,
	    	"focus": 					      FUNCTION,
	    	"getBBox": 					      FUNCTION,
	    	"ownerSVGElement": 				  SKIP_OPAQUE,
	    	"onabort":                     	  EVENT,
	    	"onblur":                         EVENT,
	    	"oncancel":                       EVENT,
	    	"oncanplay":                      EVENT,
	    	"oncanplaythrough":               EVENT,
	    	"onchange":                       EVENT,
	    	"onclick":                        EVENT,
	    	"onclose":                        EVENT,
	    	"oncontextmenu":                  EVENT,
	    	"oncuechange":                    EVENT,
	    	"ondblclick":                     EVENT,
	    	"ondrag":                         EVENT,
	    	"ondragend":                      EVENT,
	    	"ondragenter":                    EVENT,
	    	"ondragleave":                    EVENT,
	    	"ondragover":                     EVENT,
	    	"ondragstart":                    EVENT,
	    	"ondrop":                         EVENT,
	    	"ondurationchange":               EVENT,
	    	"onemptied":                      EVENT,
	    	"onended":                        EVENT,
	    	"onerror":                        EVENT,
	    	"onfocus":                        EVENT,
	    	"oninput":                        EVENT,
	    	"oninvalid":                      EVENT,
	    	"onkeydown":                      EVENT,
	    	"onkeypress":                     EVENT,
	    	"onkeyup":                        EVENT,
	    	"onload":                         EVENT,
	    	"onloadeddata":                   EVENT,
	    	"onloadedmetadata":               EVENT,
	    	"onloadstart":                    EVENT,
	    	"onmousedown":                    EVENT,
	    	"onmouseenter":                   EVENT,
	    	"onmouseleave":                   EVENT,
	    	"onmousemove":                    EVENT,
	    	"onmouseout":                     EVENT,
	    	"onmouseover":                    EVENT,
	    	"onmouseup":                      EVENT,
	    	"onmousewheel":                   EVENT,
	    	"onpause":                        EVENT,
	    	"onplay":                         EVENT,
	    	"onplaying":                      EVENT,
	    	"onprogress":                     EVENT,
	    	"onratechange":                   EVENT,
	    	"onreset":                        EVENT,
	    	"onresize":                       EVENT,
	    	"onscroll":                       EVENT,
	    	"onseeked":                       EVENT,
	    	"onseeking":                      EVENT,
	    	"onselect":                       EVENT,
	    	"onshow":                         EVENT,
	    	"onstalled":                      EVENT,
	    	"onsubmit":                       EVENT,
	    	"onsuspend":                      EVENT,
	    	"ontimeupdate":                   EVENT,
	    	"ontoggle":                       EVENT,
	    	"onvolumechange":                 EVENT,
	    	"onwaiting":                      EVENT,
	    	"style":						  DEFAULT,
	    	"tabIndex": 				      DEFAULT,
	    	"viewportElement":        		  SKIP_OPAQUE
    	},
		"SVGSVGElement": {
			"animationsPaused":				  FUNCTION,
			"checkIntersection":			  FUNCTION,
			"checkEnclosure":				  FUNCTION,
			"contentScriptType":			  DEFAULT,
			"contentStyleType":				  DEFAULT,
			"createSVGAngle":				  FUNCTION,
			"createSVGLength":				  FUNCTION,
			"createSVGMatrix":				  FUNCTION,
			"createSVGNumber":				  FUNCTION,
			"createSVGPoint":				  FUNCTION,
			"createSVGRect":				  FUNCTION,
			"createSVGTransform":			  FUNCTION,
			"createSVGTransformFromMatrix":	  FUNCTION,
			"currentScale":		  			  DEFAULT,
			"currentTranslate":		  		  DEFAULT,
			"currentView":		  			  DEFAULT,
			"forceRedraw":				      FUNCTION,
			"height":						  DEFAULT,
			"pauseAnimations":				  FUNCTION,
			"pixelUnitToMillimeterX":		  DEFAULT,
			"pixelUnitToMillimeterY":		  DEFAULT,
			"getCurrentTime":				  FUNCTION,
			"getEnclosureList":				  FUNCTION,
			"getElementById":				  FUNCTION,
			"getIntersectionList":			  FUNCTION,
			"screenPixelToMillimeterX":		  DEFAULT,
			"screenPixelToMillimeterY":		  DEFAULT,
			"setCurrentTime":				  FUNCTION,
			"suspendRedraw":				  FUNCTION,
			"unpauseAnimations":			  FUNCTION,
			"unsuspendRedraw":				  FUNCTION,
			"unsuspendRedrawAll":			  FUNCTION,
			"useCurrentView":		  		  DEFAULT,
			"viewport":						  DEFAULT,
			"width":						  DEFAULT,
			"x":							  DEFAULT,
			"y":							  DEFAULT
		},
	    "Element": {
	        "animate":                        FUNCTION,
	        "attributes":                     DEFAULT,
	        "children":                       DEFAULT,
	        "classList":                      DEFAULT,
	        "className":                      DEFAULT,
	        "clientHeight":                   DEFAULT,
	        "clientLeft":                     DEFAULT,
	        "clientTop":                      DEFAULT,
	        "clientWidth":                    DEFAULT,
	        "closest":                        FUNCTION,
	        "getAttribute":                   FUNCTION,
	        "getAttributeNS":                 FUNCTION,
	        "getAttributeNode":               FUNCTION,
	        "getAttributeNodeNS":             FUNCTION,
	        "getBoundingClientRect":          FUNCTION,
	        "getClientRects":                 FUNCTION,
	        "getDestinationInsertionPoints":  FUNCTION,
	        "getElementsByClassName":         FUNCTION,
	        "getElementsByTagName":           FUNCTION,
	        "getElementsByTagNameNS":         FUNCTION,
	        "hasAttribute":                   FUNCTION,
	        "hasAttributeNS":                 FUNCTION,
	        "hasAttributes":                  FUNCTION,
	        "id":                             DEFAULT,
	        "innerHTML":                      DEFAULT,
	        "insertAdjacentElement":          FUNCTION,
	        "insertAdjacentHTML":             FUNCTION,
	        "insertAdjacentText":             FUNCTION,
	        "localName":                      DEFAULT,
	        "matches":                        FUNCTION,
	        "namespaceURI":                   DEFAULT,
	        "nextElementSibling":             SKIP_OPAQUE,
	        "onbeforecopy":                   EVENT,
	        "onbeforecut":                    EVENT,
	        "onbeforepaste":                  EVENT,
	        "oncopy":                         EVENT,
	        "oncut":                          EVENT,
	        "onpaste":                        EVENT,
	        "onsearch":                       EVENT,
	        "onselectstart":                  EVENT,
	        "onwebkitfullscreenchange":       EVENT,
	        "onwebkitfullscreenerror":        EVENT,
	        "onwheel":                        EVENT,
	        "outerHTML":                      DEFAULT,
	        "prefix":                         DEFAULT,
	        "previousElementSibling":         SKIP_OPAQUE,
	        "querySelector":                  FUNCTION,
	        "querySelectorAll":               FUNCTION,
	        "remove":                         FUNCTION,
	        "removeAttribute":                FUNCTION,
	        "removeAttributeNS":              FUNCTION,
	        "removeAttributeNode":            FUNCTION,
	        "requestPointerLock":             FUNCTION,
	        "scrollHeight":                   DEFAULT,
	        "scrollIntoView":                 FUNCTION,
	        "scrollIntoViewIfNeeded":         FUNCTION,
	        "scrollLeft":                     DEFAULT,
	        "scrollTop":                      DEFAULT,
	        "scrollWidth":                    DEFAULT,
	        "setAttribute":                   FUNCTION,
	        "setAttributeNS":                 FUNCTION,
	        "setAttributeNode":               FUNCTION,
	        "setAttributeNodeNS":             FUNCTION,
	        "tagName":                        DEFAULT
	    },
		"CharacterData": {
			"after":                          FUNCTION,
			"appendData":                     FUNCTION,
			"before":                         FUNCTION,
			"data":                           DEFAULT,
			"deleteData":                     FUNCTION,
			"insertData":                     FUNCTION,
			"length":                         DEFAULT,
			"nextElementSibling":             SKIP_OPAQUE,
			"previousElementSibling":         SKIP_OPAQUE,
			"remove":                         FUNCTION,
			"replaceData":                    FUNCTION,
			"replaceWith":                    FUNCTION,
			"substringData":                  FUNCTION
		},
		"Text": {
			"assignedSlot":                   DEFAULT,
			"isElementContentWhitespace":     DEFAULT,
			"replaceWholeText":               FUNCTION,
			"splitText":                      FUNCTION,
			"wholeText":                      DEFAULT
		},
		"Node": SecureElement.nodeMetadata,
		"EventTarget": SecureElement.eventTargetMetadata
	}
};

SecureElement.isSharedElement = function(el) {
    return el === document.body ||
        el === document.head ||
        el === document.documentElement;
};

SecureElement.secureQuerySelector = function(el, key, selector) {
    var rawAll = el.querySelectorAll(selector);
    for (var n = 0; n < rawAll.length; n++) {
        var raw = rawAll[n];
        var rawKey = ls_getKey(raw);
        if (rawKey === key || SecureElement.isSharedElement(raw)) {
            return SecureElement(raw, key);
        }
    }

    return null;
};



