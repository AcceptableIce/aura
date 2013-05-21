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
        rules: {"PRC":[{"name":"PRC","_from":"1986","_to":"only","type":"-","in":"May","on":"4","at":"0:00","_save":"1:00","letter":"D"},{"name":"PRC","_from":"1986","_to":"1991","type":"-","in":"Sep","on":"Sun>=11","at":"0:00","_save":"0","letter":"S"},{"name":"PRC","_from":"1987","_to":"1991","type":"-","in":"Apr","on":"Sun>=10","at":"0:00","_save":"1:00","letter":"D"}]},
        zones: {"Asia/Urumqi":[{"name":"Asia/Urumqi","_offset":"5:50:20","_rule":"-","format":"LMT","_until":"1928"},{"name":"Asia/Urumqi","_offset":"6:00","_rule":"-","format":"URUT","_until":"1980 May"},{"name":"Asia/Urumqi","_offset":"8:00","_rule":"PRC","format":"C%sT","_until":""}]}
    };
    window.WallTime.autoinit = true;
}).call(this);