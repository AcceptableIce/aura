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
    DELEGATED_EVENTS: [
        'click',
        'mouseover',
        'mouseout',
        'keypress',
        'dragstart',
        'dragend',
        'dragenter',
        'dragleave'
    ],
    initialize: function (cmp) {
        // Internal variables we use
        cmp._template          = null;
        cmp._virtualItems      = [];
        cmp._ptv               = null;
        cmp._dirtyFlag         = 0;
        cmp.set('v._dirty', 0, true);
    },
    initializeBody: function (cmp) {
        var body = cmp.get('v.body');
        if (!body.length) {
            var bodyCmp = $A.newCmp({
                componentDef: 'aura:html',
                attributes: { values: { tag: 'section' } }
            }, cmp);
            cmp.set('v.body', [bodyCmp]);
        }
    },
    initializeDataModel: function(cmp) {
        var dataModel = cmp.get("v.dataProvider")[0];
        if (dataModel) {
            dataModel.addHandler("onchange", cmp, "c.handleDataChange");
        }
    },
     _createPassthroughValue: function(cmp, itemVar, item) {
        var context = {};
        context[itemVar] = item;
        return $A.expressionService.createPassthroughValue(context, cmp);
    },
    onItemChange: function (cmp, ptv, evt) {
        if (!ptv.ignoreChanges) {
            ptv.dirty = true;
        }

        if (!ptv.sync && cmp.isRendered()) { // Some component has updated asyncronously the item, rerender it

            ptv.sync = true; // at this point the action becomes sync
            var item = evt.getParam('value');
            this._rerenderDirtyElement(cmp, item);
        }
    },
    ignorePTVChanges: function (cmp, ignore) {
        cmp._ptv.sync = ignore;
        cmp._ptv.ignoreChanges = ignore;
    },
    _initializeItemTemplate: function (cmpTemplate) {
        var container = document.createDocumentFragment();
        $A.render(cmpTemplate, container);
        return container;
    },
    initializeTemplate: function (cmp) {
        var self  = this,
            tmpl  = cmp.get('v.itemTemplate')[0],
            ref   = cmp.get('v.itemVar'),
            ptv   = this._createPassthroughValue(cmp, ref),
            shape = $A.newCmp(tmpl, ptv);

        // Initialize internal setup
        cmp._shape             = shape;
        cmp._ptv               = ptv;
        cmp._template          = this._initializeItemTemplate(shape);
        ptv.ignoreChanges      = true;
        ptv.dirty              = false;

        cmp.addValueHandler({
            event  : 'change',
            value  : ref,
            method : this.onItemChange.bind(this, cmp, ptv)
        });
    },

    initializeItems: function (cmp) {
        var dataModel = cmp.get("v.dataProvider")[0],
            model     = dataModel && dataModel.getModel(),
            items     = model && model.get('items');

        if (items) {
            cmp.set("v.items", items, true);
        } else if (dataModel) {
            dataModel.getEvent('provide').fire();
        }
    },
    _attachItemToElement: function (dom, item) {
        dom._data = item;
    },
    _generateVirtualItem: function (cmp, item) {
        var rowTmpl = cmp._template,
            ptv     = cmp._ptv,
            itemVar = cmp.get('v.itemVar'),
            clonedItem;

        // Change the PTV -> dirty whatever is needed
        ptv.set(itemVar, item);

        cmp.markClean('v.items'); // Mark ourselves clean before rerender (avoid calling rerender on ourselves)
        $A.renderingService.rerenderDirty('virtualRendering');

        // Snapshot the DOM
        clonedItem = rowTmpl.firstChild.cloneNode(true);

        // Attach the data to the element
        this._attachItemToElement(clonedItem, item);

        return clonedItem;
    },
    createVirtualList: function (cmp) {
        var items = cmp.get('v.items');
        cmp._virtualItems = [];
        if (items && items.length) {
            for (var i = 0; i < items.length; i++) {
                cmp._virtualItems.push(this._generateVirtualItem(cmp, items[i]));
            } 
        }
    },
    getListBody: function (cmp, dom) {
        var node = dom ? dom[0] : cmp.getElement();
        return  node;
    },
    markClean: function (cmp, value) {
        var concreteCmp = cmp.getConcreteComponent();
        concreteCmp.markClean(value);
    },
    markDirty: function (cmp) {
        var concreteCmp = cmp.getConcreteComponent();
        concreteCmp.set('v._dirty', ++cmp._dirtyFlag);
    },
    createEventDelegates: function (cmp, container) {
        var self     = this,
            events   = this.DELEGATED_EVENTS,
            delegate = function (e) {
                self._eventDelegator(cmp, e);
            };
        
        for (var i = 0; i < events.length; i++) {
            container.addEventListener(events[i], delegate, false);
        }
    },
    _findVirtualElementPosition: function (virtualElements, item, element) {
        for (var i = 0; i < virtualElements.length; i++) {
            var ve = virtualElements[i];
            if (element && ve === element || ve._data === item) {
                return i;
            }
        }
    },
    _replaceDOMElement: function (parent, newChild, oldChild) {
        parent.replaceChild(newChild, oldChild);
    },
    _rerenderDirtyElement: function (cmp, item, oldElement) {
        var container  = cmp._template,
            listRoot   = this.getListBody(cmp),
            items      = cmp._virtualItems,
            position   = this._findVirtualElementPosition(items, item, oldElement),
            newElement = this._generateVirtualItem(cmp, item);

        if (!oldElement) {
            oldElement = items[position];
        }

        items[position] = newElement;
        this._replaceDOMElement(listRoot, newElement, oldElement);
    },
    _getRenderingComponentForElement: function (domElement) {
        var id  = $A.util.getDataAttribute(domElement, 'auraRenderedBy');
        return id && $A.componentService.get(id);
    },
    _dispatchAction: function (actionHandler, event) {
        actionHandler.evaluate().runDeprecated(event);
    },
    _getItemAttached: function (dom) {
        return dom._data;
    },
    _getActionHandler: function (htmlCmp, eventType) {
        var eventTypeAttribute = 'on' + eventType,
            htmlAttr = htmlCmp.get('v.HTMLAttributes');
        return htmlAttr && htmlAttr[eventTypeAttribute];
    },
    _eventDelegator: function (cmp, e) {
        var type     = e.type,
            target    = e.target,
            ref       = cmp.get('v.itemVar'),
            handlers  = [],
            shape     = cmp._shape,
            ptv       = cmp._ptv,
            item;

        while (target) {
            targetCmp = this._getRenderingComponentForElement(target);
            // Guard for existance since there are cases like container components 
            // that might not have elements associated with them.
            if (targetCmp) { 
                actionHandler = this._getActionHandler(targetCmp, type);
                if (actionHandler) {
                    handlers.push(actionHandler);
                }
            }

            if ((item = this._getItemAttached(target))) {
                break;
            }
            target = target.parentElement;
        }

        if (!handlers.length > 0) {
        	return;
        }
        
        if (item) {
            // Seting up the event with some custom properties
            e.templateItem = item;
            e.templateElement = target;
            shape.getElement = function () {return target;};

            // Setting up the component with the current item
            ptv.sync  = true;
            ptv.set(ref, item);
            ptv.ignoreChanges = false;
            ptv.dirty = false;
            

            // Execute the collected handlers in order
            while ((actionHandler = handlers.shift())) {
                if ($A.util.isExpression(actionHandler)) {
                    this._dispatchAction(actionHandler, e);
                }
            }
            
            // TODO: Being smarter when to rerender: 
            // If there is an internal change (no ptv), 
            // content wont update automatically:
            if (ptv.dirty || cmp.get('v.forceRender')) { 
                this._rerenderDirtyElement(cmp, item, target);
            }

            ptv.ignoreChanges = true;
            ptv.sync = false;
        }
    }
})