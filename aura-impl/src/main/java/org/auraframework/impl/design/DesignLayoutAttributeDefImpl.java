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
package org.auraframework.impl.design;

import org.auraframework.def.design.DesignLayoutAttributeDef;
import org.auraframework.impl.system.DefinitionImpl;
import org.auraframework.throwable.quickfix.QuickFixException;
import org.auraframework.util.json.Json;

import java.io.IOException;

public class DesignLayoutAttributeDefImpl extends DefinitionImpl<DesignLayoutAttributeDef> implements DesignLayoutAttributeDef {
    private final String name;

    protected DesignLayoutAttributeDefImpl(Builder builder) {
        super(builder);
        this.name = builder.name;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public void serialize(Json json) throws IOException { }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        DesignLayoutAttributeDefImpl that = (DesignLayoutAttributeDefImpl) o;

        if (name != null ? !name.equals(that.name) : that.name != null) return false;

        return true;
    }

    @Override
    public int hashCode() {
        return name.hashCode();
    }

    public static class Builder extends DefinitionImpl.BuilderImpl<DesignLayoutAttributeDef> {
        private String name;
        public Builder() {
            super(DesignLayoutAttributeDef.class);
        }

        public void setAttributeName(String name) {
            this.name = name;
        }

        @Override
        public DesignLayoutAttributeDef build() throws QuickFixException {
            return new DesignLayoutAttributeDefImpl(this);
        }
    }
}
