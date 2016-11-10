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
    /**
     * assign interactive.js's functions to helper to keep
     * this patch change close to the original implementation
     * NOTE: This fix is for label access check and only for 204/patch
     */
    initInteractiveLib: function() {
        $A.util.apply(this, this.lib.interactive, false);
    },

    /**
     * This function is a copy from interactiveHelper.js because
     * interactive.js's domEventHandler does thing a little bit differently
     * NOTE: This fix is for label access check and only for 204/patch
     * 
     * Handles a DOM-level event and throws the Aura-level equivalent.
     *
     * This same function is used for all DOM->Aura event wireup on components, which has multiple benefits:
     * - decreased memory footprint
     * - no need to protect against a handler being added more than once
     * - no need to track event->handler function mappings for later removal
     */
    domEventHandler: function (event) {
        var element = event.currentTarget || event.target;
        var htmlCmp = $A.componentService.getRenderingComponentForElement(element);

        // cmp might be destroyed, just ignore this event.
        if (!htmlCmp) {
            return;
        }

        var component = htmlCmp.getComponentValueProvider().getConcreteComponent();
        var helper = component.helper;

        if (!helper || component._recentlyClicked) {
            return;
        }

        // extended components can do some event processing before the Aura event gets fired
        if (helper.preEventFiring) {
            helper.preEventFiring(component, event);
        }

        // fire the equivalent Aura event
        if (helper.fireEvent) {
            helper.fireEvent(component, event, helper);
        }

        if (event.type === "click" 
                && component.getDef().getAttributeDefs().getDef("disableDoubleClicks") 
                && component.get("v.disableDoubleClicks")) {
            component._recentlyClicked = true;
            window.setTimeout(function() { component._recentlyClicked = false; }, 350);
        }
    },

    /**
     * Fire the equivalent Aura event for DOM one.
     * This can be overridden by extended component
     *
     * @param event must be a DOM event
     */
    fireEvent : function (component, event, helper) {
        // As the result as another event
        // this component could become invalid, so guard just in-case
        if(component.isValid()) {
           var e = component.getEvent(event.type);
           helper.setEventParams(e, event);
           e.setComponentEvent();
           e.fire();
        }
    },

    addTriggerDomEvents: function(component) {
        var events = ["click", "keydown"];
        for (var i=0, len=events.length; i < len; i++) {
            if (!component.hasEventHandler(events[i])) {
                this.addDomHandler(component, events[i]);
            }
        }
    },

    /*
     * preEventFiring is a method from ui:interactive that is meant to be overridden
     * it allows developers to respond to dome events that are registered by addTriggerDomeEvents (see above)
     */
    preEventFiring: function(component, event) {
        if (event.type === "keydown") {
            if (event.keyCode === 32) { // space key
                $A.util.squash(event, true);
                this.firePopupEvent(component, "e.popupTriggerPress");
            } else if (event.keyCode === 39 || event.keyCode === 40 || event.keyCode === 37 || event.keyCode === 38) { // right, down, left, or up key
                $A.util.squash(event, true);
                this.firePopupEvent(component, "e.popupTargetShow", {
                    event : event
                }); // for key arrows, we want to only show the target since the menu should stay visible so users can interact with it
            } else if (event.keyCode === 9 || event.keyCode === 27) { // tab or escape
                this.firePopupEvent(component, "e.popupTargetHide", {
                    event: event
                });
            }

            this.firePopupEvent(component, "e.popupKeyboardEvent", {
                event : event
            });
        }
    },

    handleClick: function(component) {
        this.handleTriggerPress(component);
    },

    handleTriggerPress: function(component) {
        this.firePopupEvent(component, "e.popupTriggerPress");
    },

    showTarget: function(component) {
        this.firePopupEvent(component, "e.popupTargetShow");
    },

    hideTarget: function(component) {
        this.firePopupEvent(component, "e.popupTargetHide");
    },

    handlePopupToggle: function(component, event) {
        var triggerParams = event.getParams(),
            localTriggerDiv = component.find('popupTriggerElement').getElement(),
            eventTriggerDiv = triggerParams.component.getElement();

        if (localTriggerDiv == null) {
            return;
        }
        if ($A.util.contains(localTriggerDiv, eventTriggerDiv)) {
            if (triggerParams.show) {
                this.showTarget(component);
            } else {
                this.hideTarget(component);
            }
        }
    },

    firePopupEvent: function(component, eventName, params) {
        if (component.get("v.disabled")) {
            return;
        }

        var event = component.getConcreteComponent().get(eventName);
        if (params) {
            event.setParams(params);
        }
        event.fire();
    }
})// eslint-disable-line semi
