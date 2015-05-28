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
    PANELS_ZOFFSET  : 100, // Default z-index start
    PANELS_ZINDEX   : 0,   // z-index counter
	PANELS_DEF      : {},  // Definitions of registered panels 
    PANELS_OWNER    : {},  // Owner relationship who creates the panel (key) owned by -> value
    PANELS_STACK    : [],  // The Panel Stack ordering
    PANELS_INSTANCE : {},  // Registered instances


	initialize: function(cmp) {
        this.initializeRegisteredPanels(cmp);
    },

    /*
    * Store internal defs
    * @private
    */
    initializeRegisteredPanels: function (cmp, newPanels) {
        var panels = newPanels || cmp.get('v.registeredPanels') || [];
        for (var i = 0; i < panels.length; ++i) {
            var panel = panels[i];
            var alias = panel.attributes.values.alias;
            var name  = alias && alias.value || panel.componentDef.descriptor.split(':').pop();
            this.PANELS_DEF[name] = panel;
        }
    },

    /*
    * Create panel
    * @public
    */
    createPanel: function (cmp, config) {
        var panelType   = config.panelType,
            panelDef    = panelType && this.PANELS_DEF[panelType],
            panelConfig = config.panelConfig || {};

        $A.assert(panelDef, 'No def for panelType :' + panelType);

        // Create panel instance
        var panel = this.createPanelInstance(cmp, panelDef, panelConfig);

        // Save instance config
        this.PANELS_INSTANCE[panel.getGlobalId()] = {
            panel           : panel,
            zindex          : panel._zIndex, 
            destroyCallback : config.onDestroy
        };

        // Set owner
        this.setPanelOwner(panel, config.owner);

        // Stack panel
        this.stackPanel(panel);

        // Render
        this.renderPanel(cmp, panel);

        if (config.onCreate) {
            config.onCreate(panel);
        }

        if (config.visible) {
            config.onBeforeShow && config.onBeforeShow(panel);
            panel.show(function (t) {
                config.onAfterShow && config.onAfterShow(panel);
            });
        }
    },

    /*
    * Sets the context in which the panel is created
    * This is mostly to figure out the the relationship between two panels
    * This function should be called before stacking a new panel
    */
    setPanelOwner: function (panel, givenOwner) {
        var previousPanel = this.PANELS_STACK[this.PANELS_STACK.length - 1],
            owner = givenOwner || previousPanel && previousPanel.get('v.body')[0].getGlobalId();

        this.PANELS_OWNER[panel.getGlobalId()] = owner;
        
    },

    /*
    * Stack a panel in our internal structures
    */
    stackPanel: function (panel) {
        this.PANELS_ZINDEX++;
        this.PANELS_STACK.push(panel);
        panel._zIndex = this.PANELS_ZOFFSET + this.PANELS_ZINDEX;
    },

    /*
    * Create panel instance
    * @private
    */
    createPanelInstance: function (cmp, panelDef, config) {
        var mergedDef = $A.util.apply({}, panelDef, true, true);
        mergedDef.flavor = config.flavor;
        //flavor is not an attribute
        delete config.flavor;
        $A.util.apply(mergedDef.attributes.values, config); // merge panel config with DefRef
        var panel = $A.newCmp(mergedDef, cmp);/*cmp:AVP*/
        var body  = panel.get('v.body')[0];
        body.setAttributeValueProvider(panel);

        return panel;
    },

    /*
    * Destroy panel instance
    * @private
    */
    destroyPanelInstance: function (cmp, config) {
        var stack      = this.PANELS_STACK,
            container  = cmp.find('container'),
            children   = container.get('v.body'),
            panelParam = config.panelInstance,
            panelId    = $A.util.isComponent(panelParam) ? panelParam.getGlobalId() : panelParam,
            panelObj   = this.PANELS_INSTANCE[panelId],
            panel      = panelObj.panel,
            index      = stack.indexOf(panel);

        $A.assert(panelObj, 'Couldnt find instance to destroy');
        $A.assert(index > -1, 'Couldnt find the reference in the stack');
        
        delete this.PANELS_OWNER[panelId];
        delete this.PANELS_INSTANCE[panelId];

        stack.splice(index, 1);
        children.splice(index, 1);
        container.set('v.body', children, true);
        panel.destroy();

        // Notify the destroy
        config.onDestroy && config.onDestroy();
        if (panelObj.onDestroy) {
            panelObj.onDestroy(panelId);
        }
        this.activateNextPanel(cmp);
    },

    /**
     * Activate the candidate panel
     * @param cmp
     * @private
     */
    activateNextPanel: function(cmp) {
        //find the panel to active
        for (var panel, i = this.PANELS_STACK.length - 1; i >= 0; i--) {
            panel = this.PANELS_STACK[i];
            if (panel && panel.isValid() && panel.get('v.activatable')) {
                panel.setActive(true);
                break;
            }
        }
    },

    /**
     * De-activate all the panels except the active one
     * @param cmp
     */
    deActivateAllPanelInstances: function(cmp, activePanel) {
        for (var panel, i = this.PANELS_STACK.length - 1; i >= 0; i--) {
            panel = this.PANELS_STACK[i];
            if (panel && panel.isValid() && panel.get('v.activatable') && panel !== activePanel) {
                panel.setActive(false);
            }
        }
    },

    /*
    * Rendering the panel
    * We call $A.render because we want to render the component inmediately
    * so we can send it back syncronously to the user
    * @private
    */
    renderPanel: function (cmp, panel) {
        var container = cmp.find('container'),
            children  = container.get('v.body'),
            dom       = container.getElement();

        $A.render(panel, dom);
        children.push(panel);
        panel.getElement().style.cssText += ' z-index:' + panel._zIndex;
        container.set('v.body', children, true/*dont mark it dirty for rendering*/);
    },
    notifyPanelContent: function (content, config) {
        var validInterface = config.typeOf ? content.isInstanceOf(config.typeOf) : true,
            validMethod    = content[config.action];

        if (validInterface && validMethod) {
            content[config.action](config.payload); // dispatch the method
        }
    },
    broadcastNotify: function (cmp, source, config) {
        var scope         = config.scope,
            currentTarget = config.currentTarget || this.getContainerPanelId(source), // CurrentTarget might have been set by the panel.
            		                                                                  // If not, we try to find it
            stack         = this.PANELS_STACK,
            owner         = this.PANELS_OWNER[currentTarget],
            panel, content, i;

        $A.assert(!scope || (scope !== 'all' || scope !== 'owner' || scope != "self"), 'Invalid target (all || owner)');

        if (scope === 'all') {
            for (i = stack.length - 1; i >= 0; --i) {
                panel   = stack[i];
                if (currentTarget !== panel.getGlobalId()) { // Dont notify itself
                	content = panel.get('v.body')[0];
                    this.notifyPanelContent(content, config);
                } 
            }
        } if (scope === 'self') {
        	if (currentTarget) {
                currentTarget = $A.getComponent(currentTarget);
                this.notifyPanelContent(currentTarget.get('v.body')[0], config);
        	}
        } else if (owner) {
            var ownerCmp = $A.getComponent(owner);
            if (ownerCmp && ownerCmp.isValid()) {
            	this.notifyPanelContent(ownerCmp, config);
            }
        }
    },

    getContainerPanelId: function (source) {
        var provider = source;
        while (provider) {
            if (provider.isInstanceOf("ui:panelType")) {
                return provider.getGlobalId();
            }
            source = provider.getAttributeValueProvider();
            provider = source !== provider ? source : null;
        }
    }
})