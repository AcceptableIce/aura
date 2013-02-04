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
package org.auraframework.impl.root.namespace;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.auraframework.def.AttributeDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.NamespaceDef;
import org.auraframework.def.RegisterEventDef;
import org.auraframework.def.RootDefinition;
import org.auraframework.impl.root.RootDefinitionImpl;
import org.auraframework.impl.util.AuraUtil;
import org.auraframework.throwable.quickfix.InvalidDefinitionException;
import org.auraframework.throwable.quickfix.QuickFixException;
import org.auraframework.util.json.Json;

public class NamespaceDefImpl extends RootDefinitionImpl<NamespaceDef> implements NamespaceDef {

    private final Map<String, String> themeTokens;

    protected NamespaceDefImpl(Builder builder) {
        super(builder);
        this.themeTokens = AuraUtil.immutableMap(builder.themeTokens);
    }

    @Override
    public Map<String, RegisterEventDef> getRegisterEventDefs() throws QuickFixException {
        return null;
    }

    @Override
    public boolean isInstanceOf(DefDescriptor<? extends RootDefinition> other) throws QuickFixException {
        return false;
    }

    @Override
    public void validateDefinition() throws QuickFixException {
        super.validateDefinition();
        for (String key : themeTokens.keySet()) {
            if (!key.equals(key.toUpperCase())) {
                throw new InvalidDefinitionException(String.format(
                        "All keys in theme tokens must be all caps.  %s is not.", key), getLocation());
            }
        }
    }

    @Override
    public Map<String, String> getThemeTokens() {
        return this.themeTokens;
    }

    @Override
    public List<DefDescriptor<?>> getBundle() {
        return null;
    }

    @Override
    public void serialize(Json json) throws IOException {
    }

    @Override
    public Map<DefDescriptor<AttributeDef>, AttributeDef> getAttributeDefs() throws QuickFixException {
        return null;
    }

    public static class Builder extends RootDefinitionImpl.Builder<NamespaceDef> {

        private Map<String, String> themeTokens;

        public Builder() {
            super(NamespaceDef.class);
        }

        @Override
        public NamespaceDefImpl build() {
            return new NamespaceDefImpl(this);
        }

        public Builder setThemeTokens(Map<String, String> themeTokens) {
            this.themeTokens = themeTokens;
            return this;
        }

    }

}
