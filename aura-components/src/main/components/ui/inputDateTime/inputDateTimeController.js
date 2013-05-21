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
    click: function(cmp, event, helper) {
        helper.displayDatePicker(cmp);
    },
    
    doInit: function(component, event, helper) {        
        // normalize format
        var format = component.get("v.format");
        if (format) {
            format = format.replace(/y/g, "Y").replace(/d/g, "D").replace(/E/g, "d").replace(/a/g, "A");
            component.setValue("v.format", format);
        }
        // TODOL get default format and timezone from LocaleValueProvider
    },
    
    openDatePicker: function(cmp, event, helper) {
        helper.displayDatePicker(cmp);
    },
    
    setValue: function(component, event, helper) {
        var outputCmp = component.find("inputText");
        var elem = outputCmp ? outputCmp.getElement() : null;
        var value = elem ? elem.value : null;
        var format = component.get("v.format");
        var hours = 0
        var mins = 0;
        var secs = 0;
        var ms = 0;
        if (value) {
            var mDate = moment.utc(value, format, helper.getLangLocale(component)); 
            hours = mDate.hours();
            mins = mDate.minutes();
            secs = mDate.seconds();
            ms = mDate.milliseconds();
        }
        
        var dateValue = event.getParam("value");
        var mNewDate = moment.utc(dateValue, "YYYY-MM-DD", helper.getLangLocale(component));
        
        var targetTime = Date.UTC(mNewDate.year(), 
                                  mNewDate.month(), 
                                  mNewDate.date(),
                                  hours,
                                  mins,
                                  secs,
                                  ms);
        var d = new Date(targetTime);
        var ret = d.toISOString();
        var timezone = component.get("v.timezone");
        if (timezone != "GMT") {
            try {
                var utcDate = WallTime.WallTimeToUTC(timezone, d); // timezone info should already be loaded
                ret = utcDate.toISOString();
            } catch (e) {
                // The timezone id is invalid or for some reason, we can't get timezone info.
            }
        }
        component.setValue("v.value", ret);
    }
})