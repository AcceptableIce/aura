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
var p = Test;
exp(p,
	// asserts
    "assert", p.assert,
    "assertTruthy", p.assertTruthy,
    "assertFalsy", p.assertFalsy,
    "assertEquals", p.assertEquals,
    "assertTrue", p.assertTrue,
    "assertFalse", p.assertFalse,
    "assertUndefinedOrNull", p.assertUndefinedOrNull,
    "assertNull", p.assertNull,
    "assertNotNull", p.assertNotNull,
    
    // test flow/state
    "fail", p.fail,
    "isComplete", p.isComplete,
    "addWaitFor", p.addWaitFor,
    "runAfterIf", p.runAfterIf,
    "setTestTimeout", p.setTestTimeout,
    "getErrors", p.getErrors,
    
    // DOM
    "getOuterHtml", p.getOuterHtml,
    "getText", p.getText,
    "getTextByComponent", p.getTextByComponent,
    "getStyle", p.getStyle,
    "getNonCommentNodes", p.getNonCommentNodes,
    "isNodeDeleted", p.isNodeDeleted,
    "select", p.select,

    // javascript
    "getPrototype", p.getPrototype,
    "overrideFunction", p.overrideFunction,
    "addFunctionHandler", p.addFunctionHandler,
    
    // actions
    "callServerAction", p.callServerAction,
    "isActionPending", p.isActionPending,
    "getAction", p.getAction,

    // internal functions
    "run", run,
    "getDump", getDump,
    "dummyFunction", p.dummyFunction
);
