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
package org.auraframework.component.test.java.controller;

import java.util.Map;

import org.auraframework.Aura;
import org.auraframework.impl.context.AuraContextImpl;
import org.auraframework.system.Annotations.AuraEnabled;
import org.auraframework.system.Annotations.Controller;
import org.auraframework.system.Annotations.Key;
import org.auraframework.system.AuraContext.GlobalValue;
import org.auraframework.test.util.AuraPrivateAccessor;

@Controller
public class ContextVPTestController {
    @AuraEnabled
    public static void registerContextVPValue(@Key("name") String name, @Key("writable") boolean writable,
            @Key("defaultValue") Object defaultValue) {
        Aura.getContextService().registerGlobal(name, writable, defaultValue);
    }

    @AuraEnabled
    public static Object getContextVPValue(@Key("name") String name) {
        return Aura.getContextService().getCurrentContext().getGlobal(name).toString();
    }

    @AuraEnabled
    public static void setContextVPValue(@Key("name") String name, @Key("value") Object value) {
        Aura.getContextService().getCurrentContext().setGlobal(name, value);
    }

    @AuraEnabled
    public static void unregisterContextVPValue(@Key("name") String name) throws Exception {
        Map<String, GlobalValue> values = AuraPrivateAccessor.get(AuraContextImpl.class, "allowedGlobalValues");
        values.remove(name);
    }
}
