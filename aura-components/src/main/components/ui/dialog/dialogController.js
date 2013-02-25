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


    /**
     * Handler for the ui:dialogManagerReady application-level event.
     * Registers this instance of ui:dialog with the manager.
     */
    registerDialog : function(cmp, evt, hlp) {

        var manager = evt.getParam("manager"),
            dialogs = manager.get("v._dialogs");

        dialogs.push(cmp);
        manager.getAttributes().setValue("_dialogs", dialogs);

    },


    /*
     * Handles the click of the "x" (close) button, or the default cancel button of
     * the dialog (present when type='alert'). Fires the application-level
     * event ui:closeDialog, setting the 'confirmClicked' attribute to false.
     */
    cancel : function(cmp, evt, hlp) {

        hlp.confirmOrCancel(cmp, false);

    },


    /*
     * Handles the click of default confirm button of the dialog (present when
     * type='alert'). Fires the application-level event ui:closeDialog, setting
     * the 'confirmClicked' attribute to true.
     */
    confirm : function(cmp, evt, hlp) {

        hlp.confirmOrCancel(cmp, true);

    },


})
