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
package configuration;

import org.auraframework.adapter.JsonSerializerAdapter;
import org.auraframework.impl.adapter.JsonSerializerAdapterImpl;
import org.auraframework.util.ServiceLoaderImpl.AuraConfiguration;
import org.auraframework.util.ServiceLoaderImpl.Impl;

/**
 * AuraImplConfig This is the spring configuration for the aura-impl module.Provide access to lower level modules (like sfdc) by
 * defining runtime implementations here. This class will be loaded by common.provider.ProviderFactory.
 */
@AuraConfiguration
public class AuraImplConfig {
    @Impl
    public static JsonSerializerAdapter auraImplJsonSerializationAdapter() {
        return new JsonSerializerAdapterImpl();
    }
}
