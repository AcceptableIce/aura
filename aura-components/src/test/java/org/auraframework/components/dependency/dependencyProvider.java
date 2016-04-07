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
package org.auraframework.components.dependency;

import org.auraframework.Aura;
import org.auraframework.def.ComponentDef;
import org.auraframework.def.ComponentDescriptorProvider;
import org.auraframework.def.DefDescriptor;
import org.auraframework.instance.AttributeSet;
import org.auraframework.instance.BaseComponent;
import org.auraframework.system.Annotations.Provider;
import org.auraframework.system.AuraContext;
import org.auraframework.throwable.quickfix.QuickFixException;

/**
 * server side provider for if.cmp
 */
@Provider
public class dependencyProvider implements ComponentDescriptorProvider {

    @Override
    public DefDescriptor<ComponentDef> provide() throws QuickFixException {

        AuraContext context = Aura.getContextService().getCurrentContext();
        BaseComponent<?, ?> component = context.getCurrentComponent();
        AttributeSet atts = component.getAttributes();

        String qualifiedName = (String)atts.getValue("qualifiedName");

        return Aura.getDefinitionService().getDefDescriptor(qualifiedName, ComponentDef.class);
   }

}
