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
package org.auraframework.impl.root.parser.handler;

import java.util.Set;

import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

import org.auraframework.def.LocatorDef;
import org.auraframework.def.RootDefinition;
import org.auraframework.impl.root.locator.LocatorDefImpl;
import org.auraframework.system.Source;
import org.auraframework.throwable.quickfix.QuickFixException;
import org.auraframework.util.AuraTextUtil;

import com.google.common.collect.ImmutableSet;

public class LocatorDefHandler<P extends RootDefinition> extends ParentedTagHandler<LocatorDef, P> {

    public static String TAG = "aura:locator";

    private static String ATTRIBUTE_TARGET = "target";
    private static String ATTRIBUTE_DESCRIPTION = "description";
    private static String ATTRIBUTE_ALIAS = "alias";
    private static final Set<String> ALLOWED_ATTRIBUTES = ImmutableSet.of(ATTRIBUTE_TARGET, ATTRIBUTE_DESCRIPTION, ATTRIBUTE_ALIAS);

    private final LocatorDefImpl.Builder builder = new LocatorDefImpl.Builder();

    public LocatorDefHandler(ContainerTagHandler<P> parentHandler, XMLStreamReader xmlReader, Source<?> source) {
        super(parentHandler, xmlReader, source);
    }

    public LocatorDefHandler() {
        super();
    }

    @Override
    public Set<String> getAllowedAttributes() {
        return LocatorDefHandler.ALLOWED_ATTRIBUTES;
    }

    @Override
    protected void handleChildTag() throws XMLStreamException, QuickFixException {
        String tag = getTagName();
        if (LocatorContextDefHandler.TAG.equals(tag)) {
            // to resolve expressions in locator context definitions, we need to pass in the component as the parent
            builder.addLocatorContext(new LocatorContextDefHandler<>(this.getParentHandler(), xmlReader, source).getElement());
        } else {
            error("Found unexpected tag inside aura:locator. %s", tag);
        }
    }

    @Override
    protected void handleChildText() throws XMLStreamException, QuickFixException {
        String text = xmlReader.getText();
        if (!AuraTextUtil.isNullEmptyOrWhitespace(text)) {
            error("No literal text allowed in " + TAG);
        }
    }

    @Override
    protected void readAttributes() throws QuickFixException {

        String description = getAttributeValue(ATTRIBUTE_DESCRIPTION);
        String target = getAttributeValue(ATTRIBUTE_TARGET);
        String alias = getAttributeValue(ATTRIBUTE_ALIAS);

        if (AuraTextUtil.isNullEmptyOrWhitespace(target)) {
            error("The attribute '%s' is required on '<%s>'.", ATTRIBUTE_TARGET, TAG);
        }

        if (AuraTextUtil.isNullEmptyOrWhitespace(description)) {
            error("The attribute '%s' is required on '<%s>'.", ATTRIBUTE_DESCRIPTION, TAG);
        }

        builder.setLocation(getLocation());
        builder.setDescription(getAttributeValue(ATTRIBUTE_DESCRIPTION));
        builder.setTarget(target);
        
        if (!AuraTextUtil.isNullEmptyOrWhitespace(alias)) {
        	builder.setAlias(alias);
        }
    }

    @Override
    public String getHandledTag() {
        return LocatorDefHandler.TAG;
    }

    @Override
    protected LocatorDef createDefinition() throws QuickFixException {
        return builder.build();
    }

}
