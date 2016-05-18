<!--

    Copyright (C) 2013 salesforce.com, inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

-->
<aura:application template="auraStorageTest:actionsStorageTemplate" controller="java://org.auraframework.impl.java.controller.ParallelActionTestController">
    <aura:attribute name="text" type="String"/>
    <aura:attribute name="errorMessage" type="String"/>
    <aura:attribute name="transactionId" type="Integer" default="999"/><!-- we use this to store tmp information for tests with abortable actions-->

    <ui:button label="Run two server actions (enqueue)" press="{!c.twoActions}" aura:id="twoActions"/>

    <ui:button label="Run server action in foreground" press="{!c.cExecuteInForeground}" aura:id="executeInForeground"/>
    <p/>
    <ui:button label="Run server action in foreground with return" press="{!c.cExecuteInForegroundWithReturn}" aura:id="executeInForegroundWithReturn"/>
    <p/>
    <ui:button label="Run server action in background" press="{!c.cExecuteInBackground}" aura:id="executeInBackground"/>
    <p/>
    <ui:button label="Run server action in background with return" press="{!c.cExecuteInBackgroundWithReturn}" aura:id="executeInBackgroundWithReturn"/>
    <p/>
    <ui:button label="Run server action in foreground with error" press="{!c.cErrorInForeground}" aura:id="errorInForeground"/>
    <p/>
</aura:application>
