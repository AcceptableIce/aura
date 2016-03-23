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
package org.auraframework.impl.javascript.controller;

import java.util.Map;
import java.util.TreeMap;

import org.auraframework.def.ActionDef;
import org.auraframework.def.ControllerDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.expression.PropertyReference;
import org.auraframework.impl.javascript.BaseJavascriptDefImpl;
import org.auraframework.impl.system.SubDefDescriptorImpl;
import org.auraframework.impl.util.AuraUtil;
import org.auraframework.instance.Action;
import org.auraframework.throwable.quickfix.DefinitionNotFoundException;

/**
 * def for client controllers
 */
public class JavascriptControllerDef extends BaseJavascriptDefImpl<ControllerDef> implements ControllerDef {
    private static final long serialVersionUID = 133829572661899255L;

    private final Map<String, JavascriptActionDef> actions;

    protected JavascriptControllerDef(Builder builder) {
        super(builder);
        this.actions = AuraUtil.immutableMap(builder.actions);
    }

    @Override
    public JavascriptActionDef getSubDefinition(String name) {
        return actions.get(name);
    }

    @Override
    public Map<String, JavascriptActionDef> getActionDefs() {
        return actions;
    }

    /**
     * We cannot sensibly <em>run</em> Javascript actions at the server, but the objects
     * are sometimes created for bookkeeping.  In particular, if a client-side action execution
     * fails, the failure is logged via ExceptionAdapter, which likes to have an action object,
     * including the action instance identifier in case that helps debugging.
     *
     * @throws DefinitionNotFoundException
     *
     * @returns an Action for the given action name.
     */
    @Override
    public Action createAction(String name, Map<String, Object> paramValues) throws DefinitionNotFoundException {
        JavascriptActionDef actionDef = actions.get(name);
        if(actionDef == null){
            DefDescriptor<ActionDef> desc = SubDefDescriptorImpl.getInstance(name, getDescriptor(), ActionDef.class);
            throw new DefinitionNotFoundException(desc);
        }
        return new JavascriptPseudoAction(actionDef);
    }

    @Override
    public Object getValue(PropertyReference key) {
        return getSubDefinition(key.toString());
    }

    public static class Builder extends BaseJavascriptDefImpl.Builder<ControllerDef> {

        public Map<String, JavascriptActionDef> actions;

        public Builder() {
            super(ControllerDef.class);
        }

        public void addActions(Map<String, JavascriptActionDef> actions) {
            if (this.actions == null) {
                this.actions = new TreeMap<>();
            }
            this.actions.putAll(actions);
        }

        @Override
        public JavascriptControllerDef build() {
            return new JavascriptControllerDef(this);
        }
    }
}
