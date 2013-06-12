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
package org.auraframework.impl.css.style;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.auraframework.Aura;
import org.auraframework.builder.StyleDefBuilder;
import org.auraframework.def.ComponentDef;
import org.auraframework.def.ComponentDefRef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.NamespaceDef;
import org.auraframework.def.StyleDef;
import org.auraframework.impl.system.DefinitionImpl;
import org.auraframework.instance.Component;
import org.auraframework.system.AuraContext;
import org.auraframework.throwable.AuraRuntimeException;
import org.auraframework.util.json.Json;

import com.google.common.collect.Maps;

/**
 * FIXME - barely implemented #W-690042
 */
public class StyleDefImpl extends DefinitionImpl<StyleDef> implements StyleDef {

    private static final long serialVersionUID = 7140896215068458158L;

    private final String className;
    private final List<ComponentDefRef> components;

    protected StyleDefImpl(Builder builder) {
        super(builder);
        this.className = builder.className;
        this.components = builder.components;
    }

    @Override
    public void appendDependencies(Set<DefDescriptor<?>> dependencies) {
        dependencies.add(Aura.getDefinitionService().getDefDescriptor(descriptor.getNamespace(),
                NamespaceDef.class));
    }

    @Override
    public String getCode() {
        Map<String, Object> attributes = Maps.newHashMap();
        attributes.put("body", components);
        try {
            Component cmp = Aura.getInstanceService().getInstance("aura:styleDef", ComponentDef.class, attributes);
            StringBuilder sb = new StringBuilder();
            Aura.getRenderingService().render(cmp, sb);
            return sb.toString();
        } catch (Exception e) {
            throw new AuraRuntimeException(e);
        }
    }

    @Override
    public void serialize(Json json) throws IOException {
        AuraContext context = Aura.getContextService().getCurrentContext();
        boolean preloaded = context.isPreloaded(getDescriptor());
        json.writeMapBegin();
        json.writeMapEntry("descriptor", descriptor);
        if (!preloaded) {
            // Note that if this starts to depend on anything beside the name of
            // the type, StyleDefCSSFormatAdapter needs to know to restructure its cache
            // keys
            String out = getCode();
            json.writeMapEntry("code", out);
        }
        json.writeMapEntry("className", className);
        json.writeMapEnd();
    }

    @Override
    public String getClassName() {
        return className;
    }

    public static class Builder extends DefinitionImpl.BuilderImpl<StyleDef> implements StyleDefBuilder {

        public Builder() {
            super(StyleDef.class);
        }

        private String className;
        private List<ComponentDefRef> components;

        @Override
        public StyleDef build() {
            return new StyleDefImpl(this);
        }

        @Override
        public StyleDefBuilder setClassName(String className) {
            this.className = className;
            return this;
        }

        @Override
        public StyleDefBuilder setComponents(List<ComponentDefRef> components) {
            this.components = components;
            return this;
        }

    }
}
