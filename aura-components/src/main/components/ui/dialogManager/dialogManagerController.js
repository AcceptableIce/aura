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
({

    openDialog : function(cmp, evt, hlp) {
        // TODO: wire up all the events for accessibility
        var dialog = evt.getParam("dialog");
        cmp.getAttributes().setValue("_activeDialog", dialog);
        hlp.activateDialog(dialog, cmp);
    },

    closeDialog : function(cmp, evt, hlp) {
        // TODO: clean up all the events
        var dialog = evt.getParam("dialog");
        dialog.getAttributes().setValue("_isVisible", false);
        cmp.getAttributes().setValue("_activeDialog", null);
    }

})