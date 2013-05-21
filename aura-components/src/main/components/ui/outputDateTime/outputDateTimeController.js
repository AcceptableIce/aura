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
    doInit: function(component, event, helper) {
        var format = component.get("v.format");
        if (format) {
            format = format.replace(/y/g, "Y").replace(/d/g, "D").replace(/E/g, "d").replace(/a/g, "A"); // translate Java patterns to moment.js pattern
            component.setValue("v.format", format);
        } else {
            // TODO: grab the default value of format from locale global value provider
            format = "YYYY-MM-DD HH:mm";
        }
        component.setValue("v.format", format);
        
        var timezone = component.get("v.timezone");
        if (!timezone) {
            // TODO: grab the default value of timezone from locale global value provider
            timezone = "GMT";
        }
        component.setValue("v.timezone", timezone);
    }
})