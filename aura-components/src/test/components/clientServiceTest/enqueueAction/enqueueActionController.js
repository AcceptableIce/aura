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
    client : function(cmp) {
        var log = cmp.get("v.log"); 
        log.push(this._toLog || "client");
        cmp.set("v.log", log);
    },

    runAction : function(cmp, event, helper) {
        var args = event.getParam("arguments");
        var path = args["path"];
        var parent = args["parent"];
        var commands = args["commands"];
        var label = args["label"];
        var options = args["options"];

        if (path && path.length) {
            var first = path.shift();
            var child = cmp.find(first);
            if($A.util.isArray(child)) {
                child = child[0];
            }
            child.runAction(path, parent, commands, label, options);
            return;
        }
        var a = helper.getAction(cmp, parent, commands, label, options);
        $A.enqueueAction(a);
    }
})
