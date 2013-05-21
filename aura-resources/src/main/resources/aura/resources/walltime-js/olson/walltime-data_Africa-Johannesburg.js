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
        rules: {"SA":[{"name":"SA","_from":"1942","_to":"1943","type":"-","in":"Sep","on":"Sun>=15","at":"2:00","_save":"1:00","letter":"-"},{"name":"SA","_from":"1943","_to":"1944","type":"-","in":"Mar","on":"Sun>=15","at":"2:00","_save":"0","letter":"-"}]},
        zones: {"Africa/Johannesburg":[{"name":"Africa/Johannesburg","_offset":"1:52:00","_rule":"-","format":"LMT","_until":"1892 Feb 8"},{"name":"Africa/Johannesburg","_offset":"1:30","_rule":"-","format":"SAST","_until":"1903 Mar"},{"name":"Africa/Johannesburg","_offset":"2:00","_rule":"SA","format":"SAST","_until":""}]}
    };
    window.WallTime.autoinit = true;
}).call(this);