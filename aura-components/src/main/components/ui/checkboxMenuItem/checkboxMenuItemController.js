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
    init: function (cmp) {
        var bodyAttribute = cmp.get("v.body");
        var hasBodyAttribute = bodyAttribute !== null && bodyAttribute.length > 0;
        if (hasBodyAttribute) {
            cmp.find("anchor").set("v.body", bodyAttribute);
        }
    },

    onClick: function (cmp, event) {
        if (cmp.isValid()) {
            $A.util.squash(event, true);
            cmp.getConcreteComponent().select();
        }
    },

    select: function (component) {
        var concreteComponent = component.getConcreteComponent();

        if (concreteComponent.get("v.disabled")) {
            return;
        }

        var current = concreteComponent.get("v.selected");
        concreteComponent.set("v.selected", !current);

        component.getSuper().select();
    }
})// eslint-disable-line semi
