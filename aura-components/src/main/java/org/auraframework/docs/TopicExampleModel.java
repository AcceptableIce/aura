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
package org.auraframework.docs;

import java.util.Collection;
import java.util.List;

import org.auraframework.annotations.Annotations.ServiceComponentModelInstance;
import org.auraframework.def.ComponentDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.DefDescriptor.DefType;
import org.auraframework.def.Definition;
import org.auraframework.def.ImportDef;
import org.auraframework.def.IncludeDefRef;
import org.auraframework.def.LibraryDef;
import org.auraframework.def.RootDefinition;
import org.auraframework.ds.servicecomponent.ModelInstance;
import org.auraframework.instance.BaseComponent;
import org.auraframework.service.ContextService;
import org.auraframework.service.DefinitionService;
import org.auraframework.system.Annotations.AuraEnabled;
import org.auraframework.system.AuraContext;
import org.auraframework.throwable.quickfix.QuickFixException;

import com.google.common.collect.Lists;

/**
 */
@ServiceComponentModelInstance
public class TopicExampleModel implements ModelInstance {

    private final List<DefModel> defs = Lists.newArrayList();
    private final List<IncludeDefModel> includeDefs = Lists.newArrayList();

    @SuppressWarnings("unchecked")
    public TopicExampleModel(ContextService contextService, DefinitionService definitionService)
            throws QuickFixException {

        AuraContext context = contextService.getCurrentContext();
        BaseComponent<?, ?> component = context.getCurrentComponent();

        String desc = (String) component.getAttributes().getValue("descriptor");

        DefType defType = DefType.valueOf(((String) component.getAttributes().getValue("defType")).toUpperCase());
        DefDescriptor<? extends RootDefinition> descriptor = (DefDescriptor<? extends RootDefinition>) definitionService
                .getDefDescriptor(desc, defType.getPrimaryInterface());

        Definition def = descriptor.getDef();

        defs.add(new DefModel(descriptor));

        if (def instanceof RootDefinition) {
            List<DefDescriptor<?>> deps = ((RootDefinition) def).getBundle();

            for (DefDescriptor<?> dep : deps) {
                defs.add(new DefModel(dep));
            }
        }

        // Add all imported libraries AND their source to the documentation.
        if (def instanceof ComponentDef) {
            Collection<ImportDef> importDefs = ((ComponentDef) def).getImportDefs();

            for (ImportDef importDef : importDefs) {
                LibraryDef libraryDef = definitionService.getDefinition(importDef.getLibraryDescriptor());
                if (ReferenceTreeModel.hasAccess(libraryDef)) {
                    defs.add(new DefModel(libraryDef.getDescriptor()));

                    // Treat the included js files specially because they load source differently:
                    for (IncludeDefRef includeDef : libraryDef.getIncludes()) {
                        includeDefs.add(new IncludeDefModel(includeDef.getIncludeDescriptor()));
                    }
                }
            }
        }
    }

    @AuraEnabled
    public List<DefModel> getDefs() {
        return defs;
    }

    @AuraEnabled
    public List<IncludeDefModel> getIncludeDefs() {
        return includeDefs;
    }
}
