/*
 * Copyright (C) 2012 salesforce.com, inc.
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
     * Moves modal windows to the bottom of the DOM so they display properly,
     * and ties the <h2> tag in the dialog header to the dialog container
     * using aria-labelledby.
     */
    afterRender : function(cmp) {

        var atts    = cmp.getAttributes(),
            isModal = atts.get("isModal"),
            ariaId  = atts.get("_ariaId"),
            mask    = cmp.find("mask"),
            dialog  = cmp.find("dialog"),
            title   = cmp.find("title");

        this.superAfterRender(cmp);

        if (isModal) {
            document.body.appendChild(mask.getElement());
            document.body.appendChild(dialog.getElement());
        }

        atts.setValue("_ariaId", title.getGlobalId());

    },


    /**
     * Applies/removes event handlers to/from various DOM elements for
     * proper interaction semantics. Handlers are applied upon dialog
     * activation, and removed upon dialog deactivation.
     */
    rerender : function(cmp, hlp) {

        var isVisible = cmp.get("v._isVisible"),
            config    = cmp.get("v._handlerConfig"),
            autoFocus = cmp.get("v.autoFocus"),
            isModal   = cmp.get("v.isModal"),
            maskCmp   = cmp.find("mask"),
            mask      = maskCmp ? maskCmp.getElement() : null,
            dialog    = cmp.find("dialog").getElement(),
            close     = cmp.find("close").getElement();

        this.superRerender(cmp, hlp);

        if (config && dialog && close) {
            // if the dialog is active, add the appropriate handlers
            if (isVisible) {
                $A.util.on(document, "keydown", config.keydownHandler, false);
                $A.util.on(document, "click", config.clickHandler, false);
                $A.util.on(window, "resize", config.resizeHandler, false);
            // else, remove them
            } else {
                $A.util.removeOn(document, "keydown", config.keydownHandler, false);
                $A.util.removeOn(document, "click", config.clickHandler, false);
                $A.util.removeOn(window, "resize", config.resizeHandler, false);
            }
            // apply/remove the appropriate css classes and focus the right element
            hlp.doAnimation(isVisible, mask, dialog, autoFocus, isModal, config);
       }

    }


})
