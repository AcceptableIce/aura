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
    SPECIAL_BOOLEANS: {
        "checked": true,
        "selected": true,
        "disabled": true,
        "readonly": true,
        "multiple": true,
        "ismap": true,
        "defer": true,
        "declare": true,
        "noresize": true,
        "nowrap": true,
        "noshade": true,
        "compact": true,
        "autocomplete": true,
        "required": true
    },

    SPECIAL_CASINGS: {
        "readonly": "readOnly",
        "colspan": "colSpan",
        "rowspan": "rowSpan",
        "bgcolor": "bgColor",
        "tabindex": "tabIndex",
        "usemap": "useMap",
        "accesskey": "accessKey",
        "maxlength": "maxLength",
        "for": "htmlFor",
        "class": "className",
        "frameborder": "frameBorder"
    },

    // "void elements" as per http://dev.w3.org/html5/markup/syntax.html#syntax-elements
    BODYLESS_TAGS: {
        "area": true,
        "base": true,
        "br": true,
        "col": true,
        "command": true,
        "embed": true,
        "hr": true,
        "img": true,
        "input": true,
        "keygen": true,
        "link": true,
        "meta": true,
        "param": true,
        "source": true,
        "track": true,
        "wbr": true
    },

    // List must be kept in sync with org.auraframework.def.HtmlTag enum
    ALLOWED_TAGS:{
        "a":true,
        "abbr":true,
        "acronym":true,
        "address":true,
        "area":true,
        "article":true,
        "aside":true,
        "audio":true,
        "b":true,
        "bdi":true,
        "bdo":true,
        "big":true,
        "blockquote":true,
        "body":true,
        "br":true,
        "button":true,
        "caption":true,
        "canvas":true,
        "center":true,
        "cite":true,
        "code":true,
        "col":true,
        "colgroup":true,
        "command":true,
        "datalist":true,
        "dd":true,
        "del":true,
        "details":true,
        "dfn":true,
        "dir":true,
        "div":true,
        "dl":true,
        "dt":true,
        "em":true,
        "fieldset":true,
        "figure":true,
        "figcaption":true,
        "footer":true,
        "form":true,
        "h1":true,
        "h2":true,
        "h3":true,
        "h4":true,
        "h5":true,
        "h6":true,
        "head":true,
        "header":true,
        "hgroup":true,
        "hr":true,
        "html":true,
        "i":true,
        "iframe":true,
        "img":true,
        "input":true,
        "ins":true,
        "keygen":true,
        "kbd":true,
        "label":true,
        "legend":true,
        "li":true,
        "link":true,
        "map":true,
        "mark":true,
        "menu":true,
        "meta":true,
        "meter":true,
        "nav":true,
        "ol":true,
        "optgroup":true,
        "option":true,
        "output":true,
        "p":true,
        "pre":true,
        "progress":true,
        "q":true,
        "rp":true,
        "rt":true,
        "ruby":true,
        "s":true,
        "samp":true,
        "script":true,
        "section":true,
        "select":true,
        "small":true,
        "source":true,
        "span":true,
        "strike":true,
        "strong":true,
        "style":true,
        "sub":true,
        "summary":true,
        "sup":true,
        "table":true,
        "tbody":true,
        "td":true,
        "textarea":true,
        "tfoot":true,
        "th":true,
        "thead":true,
        "time":true,
        "title":true,
        "tr":true,
        "track":true,
        "tt":true,
        "u":true,
        "ul":true,
        "var":true,
        "video":true,
        "wbr":true
    },

    // string constants used to save and remove click handlers
    NAMES: {
        "domHandler": "fcDomHandler",
        "hashHandler": "fcHashHandler"
    },

    caseAttribute: function (attribute) {
        return this.SPECIAL_CASINGS[attribute] || attribute;
    },

    /**
     * Adds or replaces existing "onclick" handler for the given handlerName.
     *
     * Is used to add independent handlers eg. dom level and hash navigation handling on <a href/>
     */
    addNamedClickHandler: function (element, handler, handlerName) {
        var previousHandler = element[handlerName];
        if ($A.util.isFunction(previousHandler)) {
            $A.util.removeOn(element, "click", previousHandler);
        }

        $A.util.on(element, "click", handler);

        element[handlerName] = handler;
        return previousHandler;
    },

    domEventHandler: function (event) {
        var eventName = "on" + event.type,
            element = event.currentTarget,
            ownerComponent = $A.componentService.getRenderingComponentForElement(element);

        // cmp might be destroyed, just ignore this event.
        if (!ownerComponent) {
            return;
        }

        var htmlAttributes = ownerComponent.get("v.HTMLAttributes"),
            valueExpression = htmlAttributes[eventName],
            onclickExpression;

        if (eventName === 'ontouchend' || eventName === 'onpointerup' || eventName === 'onMSPointerUp') {
            // Validate that either onclick or ontouchend is wired up to an action never both simultaneously
            onclickExpression = htmlAttributes["onclick"];
            if (!$A.util.isEmpty(onclickExpression)) {
                if ($A.util.isEmpty(valueExpression)) {
                    // Map from touch event to onclick
                    valueExpression = onclickExpression;
                }
            }
        }

        if ($A.util.isExpression(valueExpression)) {
            var action = valueExpression.evaluate();
            // This can resolve to null if you have an expression pointing to an attribute which could be an Action
            if(action) {
                this.dispatchAction(action, event, ownerComponent);
            }
        }
    },

    // NOTE: Do not remove attributes from this method
    // Used by MetricsService plugin to collect information
    dispatchAction: function (action, event) {
        $A.run(function() {
            action.runDeprecated(event);
        });
    },

    canHaveBody: function (component) {
        var tag = component.get("v.tag");
        if ($A.util.isUndefinedOrNull(tag)) {
            throw new Error("Undefined tag attribute for " + component.getGlobalId());
        }
        return !this.BODYLESS_TAGS[tag.toLowerCase()];
    },

    createHtmlAttribute: function (component, element, name, attribute) {
        var value;
        var lowerName = name.toLowerCase();

        // special handling if the attribute is an inline event handler
        if (lowerName.indexOf("on") === 0) {
            var eventName = lowerName.substring(2);
            if (eventName === "click") {
                this.addNamedClickHandler(element, $A.getCallback(this.domEventHandler.bind(this)), this.NAMES.domHandler);
            } else {
                $A.util.on(element, eventName, $A.getCallback(this.domEventHandler.bind(this)));
            }
        } else {
            var isSpecialBoolean = this.SPECIAL_BOOLEANS.hasOwnProperty(lowerName);
            if ($A.util.isExpression(attribute)) {
                attribute.addChangeHandler(component, "HTMLAttributes." + name);
                value = attribute.evaluate();
            } else {
                value = attribute;
            }

            if (isSpecialBoolean) {
                value = $A.util.getBooleanValue(value);
            }

            var isString = $A.util.isString(value);
            if (isString && value.indexOf("/auraFW") === 0) {
                // prepend any Aura resource urls with servlet context path
                value = $A.getContext().getContextPath() + value;
            }

            if (lowerName === "href" && element.tagName === "A" && value && $A.util.supportsTouchEvents()) {
                var HTMLAttributes = component.get("v.HTMLAttributes");
                var target = HTMLAttributes["target"];

                if ($A.util.isExpression(target)) {
                    target = target.evaluate();
                }

                this.addNamedClickHandler(element, function () {
                    if (isString && value.indexOf("#") === 0) {
                        $A.run(function () {
                            $A.historyService.set(value.substring(1));
                        });
                    }
                }, this.NAMES.hashHandler);
                if(target){
                	element.setAttribute("target", target);
                }
                element.setAttribute("href", value);
            } else if (!$A.util.isUndefinedOrNull(value) && (lowerName === "role" || lowerName.lastIndexOf("aria-", 0) === 0)) {
                // use setAttribute to render accessibility attributes to markup
                // do not set the property on the HTMLElement if value is null or undefined to avoid accessibility confusion.
                element.setAttribute(name, value);
            } else if (isSpecialBoolean) {
                // handle the boolean attributes for whom presence implies truth
                var casedName = this.caseAttribute(lowerName);
                if (value === false) {
                    element.removeAttribute(casedName);

                    // Support for IE's weird handling of checked (unchecking case):
                    if (casedName === "checked") {
                        element.removeAttribute("defaultChecked");
                    }
                } else {
                    element.setAttribute(casedName, name);

                    // Support for IE's weird handling of checked (checking case):
                    if (casedName === "checked") {
                        element.setAttribute("defaultChecked", true);
                    }
                }

                // We still need to make sure that the property is set on the HTMLElement, because it is used for
                // change detection:
                if($A.util.isUndefinedOrNull(value)){
                    value='';
                }
                element[casedName] = value;
            } else {

                // KRIS: HALO:
                // If in older IE's you set the type attribute to a value that the browser doesn't support
                // you'll get an exception.
                // Also, you can't change the type after the element has been added to the DOM.
                // Honestly, I can't see how this wasn't blowing up Pre-halo
                if ($A.util.isIE && element.tagName === "INPUT" && lowerName === "type") {
                    try {
                        element.setAttribute("type", value);
                    } catch (e) {
                        return undefined;
                    }
                }
                // as long as we have a valid value at this point, set
                // it as an attribute on the DOM node
                // IE renders null value as string "null" for input (text)
                // element, we have to work around that.
                else if (!$A.util.isUndefined(value) && !($A.util.isIE && element.tagName === "INPUT" && lowerName === "value" && value === null)) {
                    var casedAttribute = this.caseAttribute(lowerName);
                    lowerName = name.toLowerCase();
                    if (lowerName === "style" && $A.util.isIE) {
                        element.style.cssText = value;
                    } else if (lowerName === "type" || lowerName === "href" || lowerName === "style" || lowerName.indexOf("data-") === 0) {
                        // special case we have to use "setAttribute"
                        element.setAttribute(casedAttribute, value);
                    } else {
                        if ($A.util.isUndefinedOrNull(value)) {
                            value = '';
                        }
                        element[casedAttribute] = value;
                    }
                }
                // W-2872594, IE11 input text set('v.value', null) would not clear up the field.
                else if ($A.util.isIE && element.tagName === "INPUT" && lowerName === "value" && value === null) {
                    element.value = '';
                }
            }
        }
    },

    destroyHtmlAttribute: function (component, name, attribute) {
        if ($A.util.isExpression(attribute)) {
            attribute.removeChangeHandler(component, "HTMLAttributes." + name);
        }
    },

    processJavascriptHref: function (element) {
		function inlineJavasciptCSPViolationPreventer(event) {
			// Check for javascript: inline javascript
			
			/*eslint-disable no-script-url*/
			var hrefTarget = this.href;
			if (hrefTarget && /javascript:\s*void\(/.test(hrefTarget.toLowerCase())) {
				event.preventDefault();
			}
		}
  		if (element.tagName === "A") {
  			var href = element.getAttribute("href");

  			if (!href) {
  		    	/*eslint-disable no-script-url*/
  				element.setAttribute("href", "javascript:void(0);");
  			}

  			if ($A.getContext().isLockerServiceEnabled) {
  				element.addEventListener("click", inlineJavasciptCSPViolationPreventer);
  			}
      }
	}
})// eslint-disable-line semi
