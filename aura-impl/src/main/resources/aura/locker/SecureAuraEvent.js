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

function SecureAuraEvent(event, key) {
    "use strict";

    var o = Object.create(null, {
        toString: {
            value: function() {
                return "SecureAuraEvent: " + event + "{ key: " + JSON.stringify(key) + " }";
            }
        },
        "fire": SecureThing.createFilteredMethod(event, "fire"),
        "getName": SecureThing.createFilteredMethod(event, "getName"),
        "getParam": SecureThing.createFilteredMethod(event, "getParam"),
        "getParams": SecureThing.createFilteredMethod(event, "getParams"),
        "getSource": SecureThing.createFilteredMethod(event, "getSource"),
        "setParam": SecureThing.createFilteredMethod(event, "setParam"),
        "setParams": SecureThing.createFilteredMethod(event, "setParams")
    });

    setLockerSecret(o, "key", key);
    setLockerSecret(o, "ref", event);
    return Object.seal(o);
}
