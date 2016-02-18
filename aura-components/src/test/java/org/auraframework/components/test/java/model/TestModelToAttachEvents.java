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
package org.auraframework.components.test.java.model;

import java.util.HashMap;
import java.util.Map;

import org.auraframework.annotations.Annotations.ServiceComponentModelInstance;
import org.auraframework.def.EventDef;
import org.auraframework.ds.servicecomponent.ModelInstance;
import org.auraframework.instance.Event;
import org.auraframework.service.ContextService;
import org.auraframework.service.InstanceService;
import org.auraframework.system.Annotations.AuraEnabled;
import org.auraframework.throwable.quickfix.DefinitionNotFoundException;
import org.auraframework.throwable.quickfix.QuickFixException;

@ServiceComponentModelInstance
public class TestModelToAttachEvents implements ModelInstance {
	
    public TestModelToAttachEvents(ContextService contextService, InstanceService instanceService) throws Exception {
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("strParam", "Go 49ers!");
        // Adding an event whose definition is in the client because of the
        // handler.
        Event evt = instanceService.getInstance("test:applicationEvent", EventDef.class, attributes);
        contextService.getCurrentContext().addClientApplicationEvent(evt);
        // Adding an event that was not preloaded and without a handler. So the
        // definition is not in the client.
        evt = instanceService.getInstance("handleEventTest:unHandledEvent", EventDef.class, null);
        contextService.getCurrentContext().addClientApplicationEvent(evt);
    }

    @AuraEnabled
    public String getModelData() {
        return "Sample Model Data";
    }
}
