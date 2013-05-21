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
(function() {
    window.WallTime || (window.WallTime = {});
    window.WallTime.data = {
        rules: {"Hond":[{"name":"Hond","_from":"1987","_to":"1988","type":"-","in":"May","on":"Sun>=1","at":"0:00","_save":"1:00","letter":"D"},{"name":"Hond","_from":"1987","_to":"1988","type":"-","in":"Sep","on":"lastSun","at":"0:00","_save":"0","letter":"S"},{"name":"Hond","_from":"2006","_to":"only","type":"-","in":"May","on":"Sun>=1","at":"0:00","_save":"1:00","letter":"D"},{"name":"Hond","_from":"2006","_to":"only","type":"-","in":"Aug","on":"Mon>=1","at":"0:00","_save":"0","letter":"S"}]},
        zones: {"America/Tegucigalpa":[{"name":"America/Tegucigalpa","_offset":"-5:48:52","_rule":"-","format":"LMT","_until":"1921 Apr"},{"name":"America/Tegucigalpa","_offset":"-6:00","_rule":"Hond","format":"C%sT","_until":""}]}
    };
    window.WallTime.autoinit = true;
}).call(this);