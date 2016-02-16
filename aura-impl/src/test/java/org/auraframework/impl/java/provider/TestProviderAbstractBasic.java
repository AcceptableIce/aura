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
/**
 */
package org.auraframework.impl.java.provider;

import org.auraframework.Aura;
import org.auraframework.annotations.Annotations.ServiceComponentProvider;
import org.auraframework.def.ComponentDef;
import org.auraframework.def.ComponentDescriptorProvider;
import org.auraframework.def.DefDescriptor;
import org.auraframework.system.Annotations.Provider;

/**
 * Returns component that extends test_Provider_AbstractBasic component
 * 
 * 
 * @since 138
 */
@ServiceComponentProvider
@Provider
public class TestProviderAbstractBasic implements ComponentDescriptorProvider {
    @Override
    public DefDescriptor<ComponentDef> provide() {
        return Aura.getDefinitionService().getDefDescriptor("test:test_Provider_AbstractBasicExtends", ComponentDef.class);
    }
}
