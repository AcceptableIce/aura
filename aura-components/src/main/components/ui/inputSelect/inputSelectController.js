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
    doInit: function (cmp, evt, helper) {
        var concreteCmp = cmp.getConcreteComponent();
        var concreteHelper = concreteCmp.getDef().getHelper() || helper;

        concreteHelper.init(concreteCmp);

        if (cmp.get("v.useMenu")) {
            helper.updateMenuLabel(concreteCmp);
            cmp._createMenuItems = true;
        }
    },

    setFocus: function (cmp) {
        if (cmp.get("v.useMenu")) {
            var menuTrigger = cmp.find("selectTrigger");
            menuTrigger.setFocus();
        } else {
            var selectElement = cmp.find("select").getElement();
            if (selectElement) {
                selectElement.focus();
            }
        }
    },

    valueChange: function (cmp, evt, helper) {
        var concreteCmp = cmp.getConcreteComponent();
        helper.updateOptionsFromValue(concreteCmp);
    },

    // Update options from the current value if flag is set
    optionsChange: function (cmp, evt, helper) {
        var concreteCmp = cmp.getConcreteComponent();

        if (concreteCmp._initOptionsFromValue) {
            concreteCmp._initOptionsFromValue = false;
            helper.updateOptionsFromValue(concreteCmp);
        } else {
            helper.updateValueFromOptions(concreteCmp);
        }
        if (cmp.get("v.useMenu") && !cmp._suspendChangeHandlers) {
            helper.updateMenuLabel(concreteCmp);
            cmp._createMenuItems = true;
        }
    },

    menuOptionSelected: function (cmp, event, helper) {
        helper.menuOptionSelected(cmp);
    },

    menuOpened: function (cmp, event, helper) {
        if (!cmp._createMenuItems) {
            return;
        }

        helper.updateMenuListWidth(cmp);

        cmp._createMenuItems = false;
        helper.createMenuItems(cmp);
    }

})// eslint-disable-line semi
