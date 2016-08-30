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
        // capture descriptor + param of the non-primed action. used in tests.
        var def = cmp.get("c.getString").getDef();
        cmp.ACTION_DESCRIPTOR = def.toString();
        cmp.ACTION_PARAM = "sent from actionPrimingController.js";
    },

    getStringAction: function(cmp) {
        var action = cmp.get("c.getString");
        action.setStorable();
        action.setParams({
            param: cmp.ACTION_PARAM
        });
        action.setCallback(this, function(a) {
            cmp.set("v.completed", true);
        });

        $A.enqueueAction(action);
    }
})