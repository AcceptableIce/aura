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
package org.auraframework.impl.root.parser.handler.design;

import com.google.common.collect.ImmutableSet;
import org.auraframework.adapter.ConfigAdapter;
import org.auraframework.adapter.DefinitionParserAdapter;
import org.auraframework.def.design.DesignDef;
import org.auraframework.def.design.DesignItemsDef;
import org.auraframework.def.design.DesignSectionDef;
import org.auraframework.impl.design.DesignSectionDefImpl;
import org.auraframework.impl.root.parser.handler.ContainerTagHandler;
import org.auraframework.impl.root.parser.handler.ParentedTagHandler;
import org.auraframework.impl.system.DefDescriptorImpl;
import org.auraframework.service.DefinitionService;
import org.auraframework.system.Source;
import org.auraframework.throwable.quickfix.QuickFixException;
import org.auraframework.util.AuraTextUtil;

import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.util.Set;

public class DesignSectionDefHandler extends ParentedTagHandler<DesignSectionDef, DesignDef> {
    public static final String TAG = "design:section";
    private static final String ATTRIBUTE_NAME = "name";
    private static final Set<String> ALLOWED_ATTRIBUTES = ImmutableSet.of(ATTRIBUTE_NAME);
    private DesignSectionDefImpl.Builder builder = new DesignSectionDefImpl.Builder();

    public DesignSectionDefHandler() {
        super();
    }

    public DesignSectionDefHandler(ContainerTagHandler<DesignDef> parentHandler, XMLStreamReader xmlReader, Source<?> source,
                                   boolean isInInternalNamespace, DefinitionService definitionService,
                                   ConfigAdapter configAdapter, DefinitionParserAdapter definitionParserAdapter) {
        super(parentHandler, xmlReader, source, isInInternalNamespace, definitionService, configAdapter, definitionParserAdapter);
        builder.setDescriptor(DefDescriptorImpl.getAssociateDescriptor(getParentDefDescriptor(), DesignSectionDef.class,
                TAG));
        builder.setAccess(getAccess(isInInternalNamespace));
    }

    @Override
    protected void handleChildTag() throws XMLStreamException, QuickFixException {
        String tag = getTagName();
        if (DesignItemsDefHandler.TAG.equalsIgnoreCase(tag)){
            DesignItemsDef items = new DesignItemsDefHandler(getParentHandler(), xmlReader, source,
                    isInInternalNamespace, definitionService, configAdapter, definitionParserAdapter).getElement();
            builder.addItems(items);
        } else {
            throw new XMLStreamException(String.format("<%s> cannot contain tag %s", getHandledTag(), tag));
        }
    }

    @Override
    protected void readAttributes() throws QuickFixException {
        String name = getAttributeValue(ATTRIBUTE_NAME);
        if (name != null) {
            builder.setName(name);
        }
    }

    @Override
    protected void handleChildText() throws XMLStreamException, QuickFixException {
        String text = xmlReader.getText();
        if (!AuraTextUtil.isNullEmptyOrWhitespace(text)) {
            error("No literal text allowed in attribute design definition");
        }
    }


    @Override
    public Set<String> getAllowedAttributes() {
        return ALLOWED_ATTRIBUTES;
    }

    @Override
    public String getHandledTag() {
        return TAG;
    }

    @Override
    protected DesignSectionDef createDefinition() throws QuickFixException {
        return builder.build();
    }
}
