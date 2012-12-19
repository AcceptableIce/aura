/*
 * Copyright (C) 2012 salesforce.com, inc.
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
/*jslint sub: true */
var p = Action.prototype;
exp(p,
    "auraType", p.auraType,
    "getDef", p.getDef,
    "setParams", p.setParams,
    "getParam", p.getParam,
    "getParams", p.getParams,
    "setCallback", p.setCallback,
    "run", p.run,
    "getState", p.getState,
    "getReturnValue", p.getReturnValue,
    "getStorage", p.getStorage,
    "runAfter", p.runAfter,
    "getError", p.getError,
    "setAbortable", p.setAbortable,
    "isAbortable", p.isAbortable,
    "setExclusive", p.setExclusive,
    "isExclusive", p.isExclusive,
    "setChained", p.setChained,
    "setStorable", p.setStorable,
    "isStorable", p.isStorable,
    "isFromStorage", p.isFromStorage,
    "toJSON", p.toJSON
    //#if {"excludeModes" : ["PRODUCTION"]}
     ,"getId", p.getId
	//#end
);
