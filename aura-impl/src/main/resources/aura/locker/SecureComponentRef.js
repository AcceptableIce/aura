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
/*jslint sub: true*/

function SecureComponentRef(component, key) {
    "use strict";

    var o = Object.create(null, {
        toString: {
            value: function() {
                return "SecureComponentRef: " + component + "{ key: " + JSON.stringify(key) + " }";
            }
        }
    });
    Object.defineProperties(o, {
        "isValid": SecureThing.createFilteredMethod(o, component, "isValid"),
        "isInstanceOf": SecureThing.createFilteredMethod(o, component, "isInstanceOf"),
        "isRendered": SecureThing.createFilteredMethod(o, component, "isRendered"),
        "getGlobalId": SecureThing.createFilteredMethod(o, component, "getGlobalId"),
        "getLocalId": SecureThing.createFilteredMethod(o, component, "getLocalId"),
        "addValueProvider": SecureThing.createFilteredMethod(o, component, "addValueProvider"),
        "set": SecureThing.createFilteredMethod(o, component, "set"),
        "get": SecureThing.createFilteredMethod(o, component, "get")

    });

    setLockerSecret(o, "key", key);
    setLockerSecret(o, "ref", component);
    return Object.seal(o);
}
