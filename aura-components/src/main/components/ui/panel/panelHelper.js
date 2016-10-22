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
    init: function(cmp) {
        var closeAction = cmp.get("v.closeAction");
        //handler for tab key to trap the focus within the modal
        var trapFocus = $A.util.getBooleanValue(cmp.get('v.trapFocus'));
        cmp._windowKeyHandler = this.lib.panelLibCore.getKeyEventListener(cmp, {
            closeOnEsc: true,
            trapFocus: trapFocus
        }, closeAction);

        this.initCloseBtn(cmp);
    },

    initCloseBtn: function (cmp) {
        //create default close button
        if ($A.util.isEmpty(cmp.get('v.closeButton')) && cmp.get('v.showCloseButton')) {
            $A.componentService.createComponent('markup://ui:button', {
                'body': $A.createComponentFromConfig({
                            descriptor: 'markup://aura:unescapedHtml',
                            attributes: {
                                value: '&times;'
                            }
                        }),
                'class': "closeBtn",
                'press': cmp.getReference("c.onCloseBtnPressed"),
                'label': cmp.get('v.closeDialogLabel'),
                'buttonTitle': cmp.get('v.closeDialogLabel'),
                'labelDisplay': "false"
            }, function(button, status){
                if (status === "SUCCESS") {
                    cmp.set('v.closeButton', button);
                }
            });
        }

        var direction = cmp.get("v.direction");
        if(direction && direction.match(/(north|south)(east|west)/)) {
            cmp.set('v.showPointer', false);
        }
    },

    _getKeyHandler: function(cmp) {
        if (!cmp._keyHandler && cmp.isValid()) {
        	var closeAction = cmp.get("v.closeAction");
            var trapFocus = $A.util.getBooleanValue(cmp.get('v.trapFocus'));
            cmp._keyHandler = this.lib.panelLibCore.getKeyEventListener(cmp, {
                closeOnEsc: true,
                closeOnTabOut:true,
                shouldReturnFocus:true,
                trapFocus: trapFocus
            }, closeAction);
        }
        return cmp._keyHandler;
    },
    
    _getMouseHandler: function(cmp) {
        if (!cmp._mouseHandler && cmp.isValid()) {
        	var closeAction = cmp.get("v.closeAction");
            cmp._mouseHandler = this.lib.panelLibCore.getMouseEventListener(cmp, {closeOnClickOut: cmp.get('v.closeOnClickOut')}, closeAction);
        }
        return cmp._mouseHandler;
    },
     
    _getReferenceElement: function(cmp) {
        var referenceElementSelector = cmp.get("v.referenceElementSelector");
        var referenceEl = cmp.get('v.referenceElement');
        
        if(!referenceEl) {
            referenceEl = referenceElementSelector ? document.querySelector(referenceElementSelector) : null;
        }
        
        // refereceElement is an array or NodeList, grabbing first element 
        if (referenceEl && !this.positioningLib.positioningUtils.isWindow(referenceEl) && ($A.util.isArray(referenceEl) || referenceEl.hasOwnProperty('length') || 
        		typeof referenceEl.length === 'number')) {
        	referenceEl = referenceEl.length > 0 ? referenceEl[0] : null;
        }

        return referenceEl;
    },

    _getRootPanelCmp: function(cmp) {
        if ($A.util.isUndefinedOrNull(cmp) || !cmp.isValid()) {
            return undefined;
        }
        
        if (cmp.getDef().getDescriptor().getQualifiedName() === 'markup://ui:panel') {
            return cmp;
        } else {
            return this._getRootPanelCmp(cmp.getSuper());
        }        
    },

    show: function (cmp, callback) {
        var autoFocus = cmp.get('v.autoFocus');
        var panelEl = cmp.getElement();
        var referenceEl = this._getReferenceElement(cmp);
        
        cmp.set('v.visible', true);

        var self = this;

        var conf = {
            useTransition: cmp.get('v.useTransition'),
            animationName: 'movefrom' + cmp.get('v.animation'),
            autoFocus: false,
            onFinish: function() {
            	var keyHandler = self._getKeyHandler(cmp);
            	if ($A.util.isFunction(keyHandler)) {
                    $A.util.on(panelEl, 'keydown', keyHandler);
            	}
                if (cmp.get('v.closeOnClickOut')) {
                    //Need to attach event in setTimeout in case the same click event that fires the show panel event
                    //bubbles up to the document, and if the closeOnClickOut is true, it causes the panel to close right away
                    //if the click is outside of the panel
                	var mouseHandler = self._getMouseHandler(cmp);
                	if ($A.util.isFunction(mouseHandler)) {
                		window.setTimeout(function () {
                            $A.util.on(document, 'click', mouseHandler);
                        }, 0);
                	}
                }
                
                if(referenceEl) {
                    panelEl.style.visibility = 'hidden';
                    
                    requestAnimationFrame($A.getCallback(function() {
                        panelEl.style.visibility = 'visible';
                        //need to set focus after animation frame
                        if (autoFocus) {
                            self.lib.panelLibCore.setFocus(cmp);
                        }
                    }));
                } else {
                    panelEl.style.visibility = 'visible';
                    if (autoFocus) {
                        self.lib.panelLibCore.setFocus(cmp);
                    }
                    $A.warning('Target element for panel not found.');
                }
            
                callback && callback();
            }
        };

        if (referenceEl) {
            panelEl.style.opacity = '0';
            panelEl.style.display = 'block';
            this.position(cmp, referenceEl, $A.getCallback(function() {
                self.positioningLib.panelPositioning.reposition();
                cmp.positioned = true;
                requestAnimationFrame($A.getCallback(function() {
                    panelEl.style.opacity = '1';
                    self.lib.panelLibCore.show(cmp, conf);
                }));
                
            }));
        } else {
            this.lib.panelLibCore.show(cmp, conf);
        }
        
    },

    reposition: function(cmp, callback) {
        if(cmp.positioned) { // reposition will blow up
                             // if you call it before positioning
            var referenceEl = this._getReferenceElement(cmp);
            this.cleanPositioning(cmp);
            if(referenceEl) {
                this.position(cmp, referenceEl, callback);
            }
        }
    },

    hide: function (cmp, callback) {
        var panelEl = cmp.getElement();
        panelEl.style.opacity = 0;
        var self = this;
        this.lib.panelLibCore.hide(cmp, {
            useTransition: cmp.get('v.useTransition'),
            animationName: 'moveto' + cmp.get('v.animation'),
            onFinish: function() {
                if(cmp.isValid()) {
                    if(cmp.positioned) {
                        panelEl.style.display = 'none';
                    }
                    var keyHandler = self._getKeyHandler(cmp);
                	if ($A.util.isFunction(keyHandler)) {
                		$A.util.removeOn(panelEl, 'keydown', keyHandler);
                	}
                	var mouseHandler = self._getMouseHandler(cmp);
                	if ($A.util.isFunction(mouseHandler)) {
                        $A.util.removeOn(document, 'click', mouseHandler);
                    }
                    cmp.set('v.visible', false);
                    callback && callback();
                } else {
                    // The panel has already been destroyed, 
                    // possibly by someobody else. Call the callback.
                    callback && callback();
                }
            }
        });
    },

    close: function (cmp, callback, shouldReturnFocus) {
        var self = this;
        cmp.getConcreteComponent().hide(function () {
            if (!cmp.isValid()) {
                return;
            }

            self.cleanPositioning(cmp);

            cmp.getEvent('notify').setParams({
                action: 'destroyPanel',
                typeOf: 'ui:destroyPanel',
                payload: {panelInstance: cmp.getGlobalId(), shouldReturnFocus: shouldReturnFocus }
            }).fire();
            if ($A.util.isFunction(callback)) {
            	callback();
            }
        });
    },

    cleanPositioning: function(cmp) {
        if(cmp.constraints) {
            cmp.constraints.forEach(function(constraint) {
                constraint.destroy();
            });

            cmp.constraints = null;
        }
    },

    position: function(cmp, referenceEl, callback) {

        var direction = cmp.get('v.direction'), 
            showPointer = cmp.get('v.showPointer'),
            align,
            pad = cmp.get('v.pad'),
            padTop = pad,
            advancedConfig = cmp.get('v.advancedConfig'),
            targetAlign, 
            pointer,
            bbDirections,
            boundingElement,
            pointerPad;
        
        cmp.getElement().classList.add('positioned');

        
        if(showPointer) {
            pointer = this._getRootPanelCmp(cmp).find('pointer').getElement();
        }

        boundingElement = cmp.get('v.boundingElement');

        if(!boundingElement) {
            boundingElement = window;
        }

        if(!advancedConfig) {

            
            switch (direction) {
                case 'north':
                    align = 'center bottom';
                    targetAlign = 'center top';
                    bbDirections = {
                        left:true,
                        right:true
                    };
                    break;
                case 'south':
                    align = 'center top';
                    targetAlign = 'center bottom';
                    bbDirections = {
                        left:true,
                        right:true
                    };
                    break;
                case 'west':
                    align = 'right center';
                    targetAlign = 'left center';
                    pointerPad = -15;
                    bbDirections = {
                        top:true,
                        bottom:true
                    };
                    break;
                case 'east':
                    align = 'left center';
                    targetAlign = 'right center';
                    pointerPad = -15;
                    bbDirections = {
                        top:true,
                        bottom:true
                    };
                    break;
                case 'southeast':
                    align = 'left top';
                    targetAlign = 'right bottom';
                    bbDirections = {
                        top:true,
                        bottom:true
                    };
                    break;
                case 'southwest':
                    align = 'right top';
                    targetAlign = 'left bottom';
                    bbDirections = {
                        top:true,
                        bottom:true
                    };
                    break;
                case 'northwest':
                    align = 'right bottom';
                    targetAlign = 'left top';
                    bbDirections = {
                        top:true,
                        bottom:true
                    };
                    break;
                case 'northeast':
                    align = 'left bottom';
                    targetAlign = 'right top';
                    bbDirections = {
                        top:true,
                        bottom:true
                    };
                    break;
                default :
                    if(direction) {
                        $A.assert(direction.match(/(south|north)(west|east)$|^(east|west|north|south)$/), 'Invalid direction');
                    }
            }
        }

        if(advancedConfig) {
            align = advancedConfig.align;
            targetAlign = advancedConfig.targetAlign;
            padTop = advancedConfig.vertPad;
            
            // insane rules to figure out where to put the arrow
            switch (align) {
                case 'left top':
                case 'left center':
                    direction = 'east';
                    break;
                case 'right top':
                case 'right center':
                    direction = 'west';
                    break;
                case 'center top':
                    direction = 'south';
                    break;
                case 'center center':
                case 'left bottom':
                case 'right bottom':
                case 'center bottom':
                    direction = 'north';
                    break;

            }

            // special cases override above
            if(align.match(/(^left|right)\stop$/) && targetAlign.match(/(^left|right|center)\sbottom$/)) {
                direction = 'south';
            } 
        }
        cmp.getElement().classList.add(direction);

        if(cmp.get('v.inside')) {
            align = targetAlign;
        }
        if(!cmp.constraints) {
            cmp.constraints = [];
            cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                element:cmp.getElement(),
                target:referenceEl,
                align:align,
                targetAlign: targetAlign,
                enable: true,
                pad: pad,
                padTop: padTop
            }));
            cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                element:cmp.getElement(),
                target: boundingElement,
                type: 'bounding box',
                enable: true,
                pad: 20
            }));

            if(pointer) {
                cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                    element:pointer,
                    target:referenceEl,
                    align: align,
                    targetAlign: targetAlign,
                    enable: true,
                    pad: pointerPad
                }));
            }

            if(pointer && direction === 'east') {
                cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                    element:pointer,
                    target:cmp.getElement(),
                    align: 'right center',
                    targetAlign: 'left center',
                    enable: true,
                    pad: pointerPad
                }));
            }

            if(pointer && direction === 'west') {
                cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                    element:pointer,
                    target:cmp.getElement(),
                    align: 'left center',
                    targetAlign: 'right center',
                    enable: true,
                    pad: pointerPad
                }));
            }
            
            if(pointer) {
                cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                    element:pointer,
                    target:cmp.getElement(),
                    type:'bounding box',
                    enable: true,
                    boxDirections: bbDirections,
                    pad: 5
                }));
            }

            // The following constraints are there
            // to keep east and west panels inside the viewport where possible
            // but still allow them to leave the viewport cleanly on scroll and 
            // never open with a panel top outside the viewport
            // W-2678291 & W-2701440
            if(direction === 'east' || direction === 'west') {

                // keep the panel above the bottom of the viewport...
                cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                        element:cmp.getElement(),
                        target:window,
                        type:'bounding box',
                        enable: true,
                        boxDirections: {
                            top: false,
                            bottom: true
                        },
                        pad: 5
                }));

                // unless it would go off screen to the top
                cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                        element:cmp.getElement(),
                        target:window,
                        type:'bounding box',
                        enable: true,
                        boxDirections: {
                            top: true,
                            bottom: false
                        },
                        pad: 5
                }));
            }

            // this constraint will keep the pointer attached to the panel,
            // so if the target is scrolled out of the viewport the whole panel will go with it
            if(pointer && (direction === 'east' || direction === 'west')) {
                cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                    element:cmp.getElement(),
                    target:pointer,
                    type:'inverse bounding box',
                    enable: true,
                    boxDirections: {
                        top: true,
                        bottom: true
                    },
                    pad: 5
                }));
            }

            if(pointer && direction === 'north') {
                cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                    element:pointer,
                    target:cmp.getElement(),
                    type:'top',
                    enable: true,
                    targetAlign: 'center bottom',
                    pad: -15
                }));
            } else if (pointer && direction === 'south') {
                cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                    element:pointer,
                    target:cmp.getElement(),
                    type:'bottom',
                    enable: true,
                    targetAlign: 'center top',
                    pad: -15
                }));
            } else if (pointer && direction === 'east') {
                cmp.constraints.push(this.positioningLib.panelPositioning.createRelationship({
                    element:pointer,
                    target:cmp.getElement(),
                    type:'right',
                    enable: true,
                    targetAlign: 'left bottom',
                    pad: -15 //this is very specific. 
                }));
            }
            
            this.positioningLib.panelPositioning.reposition(callback);
        } else {
            this.positioningLib.panelPositioning.reposition(callback);
        }
    },
    
    scopeScrollables: function (cmp) {
        this.lib.panelLibCore.scopeScrollables(cmp);
    },
    
    startY : 0,
    iNoBounceEnabled : false,
    iNoBounce : function (el) {
        this.startY = 0;
        if (this.isScrollSupported()) {
            this.enableINoBounce(el);
        }
    },
    enableINoBounce : function (el) {
        el.addEventListener('touchstart', this.handleTouchstart, false);
        el.addEventListener('touchmove', this.handleTouchmove, false);
        this.iNoBounceEnabled = true;
    },
    handleTouchstart : function (evt) {
        // Store the first Y position of the touch
        this.startY = evt.touches ? evt.touches[0].screenY : evt.screenY;
    },
    handleTouchmove : function (evt) {
        // Get the element that was scrolled upon
        var el = evt.target;

        // Check all parent elements for scrollability
        while (el !== document.body) {
            // Get some style properties
            var style = window.getComputedStyle(el);

            if (!style) {
                // If we've encountered an element we can't compute the style for, get out
                evt.preventBounce = false;
                break;
            }

            var scrolling = style.getPropertyValue('-webkit-overflow-scrolling');
            var overflowY = style.getPropertyValue('overflow-y');
            var height = parseInt(style.getPropertyValue('height'), 10);

            // Determine if the element should scroll
            var isScrollable = scrolling === 'touch' && (overflowY === 'auto' || overflowY === 'scroll');
            var canScroll = el.scrollHeight > el.offsetHeight;

            if (isScrollable && canScroll) {
                // Get the current Y position of the touch
                var curY = evt.touches ? evt.touches[0].screenY : evt.screenY;

                // Determine if the user is trying to scroll past the top or bottom
                // In this case, the window will bounce, so we have to prevent scrolling completely
                var isAtTop = (this.startY <= curY && el.scrollTop === 0);
                var isAtBottom = (this.startY >= curY && el.scrollHeight - el.scrollTop === height);

                // Stop a bounce bug when at the bottom or top of the scrollable element
                if (isAtTop || isAtBottom) {
                    evt.preventDefault();
                }

                // No need to continue up the DOM, we've done our job
                evt.preventBounce = false;
                return;
            }

            // Test the next parent
            el = el.parentNode;
        }

        // Stop the bouncing -- no parents are scrollable
        evt.preventDefault();
    },
    isScrollSupported : function () {
        var scrollSupport,
            testDiv = document.createElement('div');

        document.documentElement.appendChild(testDiv);
        testDiv.style.WebkitOverflowScrolling = 'touch';
        scrollSupport = 'getComputedStyle' in window && window.getComputedStyle(testDiv)['-webkit-overflow-scrolling'] === 'touch';
        document.documentElement.removeChild(testDiv);
        return scrollSupport;
    }
})// eslint-disable-line semi
