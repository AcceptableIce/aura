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

import org.auraframework.def.DefDescriptor;
import org.auraframework.def.DefDescriptor.DefType;
import org.auraframework.def.IncludeDef;
import org.auraframework.def.LibraryDef;
import org.auraframework.def.RootDefinition;
import org.auraframework.impl.DefinitionAccessImpl;
import org.auraframework.impl.root.library.IncludeDefRefImpl;
import org.auraframework.service.DefinitionService;
import org.auraframework.system.AuraContext.Access;
import org.auraframework.system.Source;
import org.auraframework.throwable.quickfix.InvalidDefinitionException;
import org.auraframework.throwable.quickfix.QuickFixException;
import org.auraframework.util.AuraTextUtil;

import com.google.common.collect.ImmutableSet;

import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;

public class IncludeDefRefHandler extends XMLHandler<IncludeDefRefImpl> {

    public static final String TAG = "aura:include";

    private static final String ATTRIBUTE_NAME = "name";
    private static final String ATTRIBUTE_IMPORTS = "imports";
    private static final String ATTRIBUTE_ALIASES = "aliases";
    private static final String ATTRIBUTE_EXPORT = "export";

    protected final static Set<String> ALLOWED_ATTRIBUTES = ImmutableSet.of(
            ATTRIBUTE_NAME, ATTRIBUTE_IMPORTS, ATTRIBUTE_ALIASES, ATTRIBUTE_EXPORT, RootTagHandler.ATTRIBUTE_DESCRIPTION);

    private RootTagHandler<? extends RootDefinition> parentHandler;
    private final IncludeDefRefImpl.Builder builder = new IncludeDefRefImpl.Builder();

    public IncludeDefRefHandler() {
        super();
    }

    public IncludeDefRefHandler(RootTagHandler<? extends RootDefinition> parentHandler, XMLStreamReader xmlReader,
                                Source<?> source, DefinitionService definitionService) {
        super(xmlReader, source, definitionService);
        this.parentHandler = parentHandler;
    }

    @Override
    @SuppressWarnings("unchecked")
    public IncludeDefRefImpl getElement() throws XMLStreamException, QuickFixException {
    	DefDescriptor<LibraryDef> parentDescriptor = (DefDescriptor<LibraryDef>) parentHandler.getDefDescriptor();
        if (parentDescriptor.getDefType() != DefType.LIBRARY) {
            throw new InvalidDefinitionException("aura:include may only be set in a library.", getLocation());
        }

        validateAttributes();

        builder.setLocation(getLocation());

        String name = getAttributeValue(ATTRIBUTE_NAME);
        if (AuraTextUtil.isNullEmptyOrWhitespace(name)) {
            throw new InvalidDefinitionException(("aura:include must specify a valid JavaScript file name."), getLocation());
        }
        builder.setDescriptor(definitionService.getDefDescriptor(String.format("%s.%s", parentDescriptor.getNamespace(), name), IncludeDef.class, parentDescriptor));

        String importNames = getAttributeValue(ATTRIBUTE_IMPORTS);
        if (!AuraTextUtil.isNullEmptyOrWhitespace(importNames)) {
            List<DefDescriptor<IncludeDef>> imports = new LinkedList<>();
            for (String importName : Arrays.asList(importNames.trim().split("\\s*\\,\\s*"))) {
                String[] parts = importName.split(":");
                if (parts.length == 1) { // local import
                    imports.add(definitionService.getDefDescriptor(
                            String.format("%s.%s", parentDescriptor.getNamespace(), importName), 
                            IncludeDef.class, parentDescriptor));
                } else if (parts.length == 3) { // external import
                    DefDescriptor<LibraryDef> externalLibrary = definitionService.getDefDescriptor(
                            String.format("%s:%s", parts[0], parts[1]), LibraryDef.class);
                    imports.add(definitionService.getDefDescriptor(String.format("%s.%s", parts[0], parts[2]),
                            IncludeDef.class, externalLibrary));
                } else { // invalid import name
                    throw new InvalidDefinitionException(String.format(
                            "Invalid name in aura:include imports property: %s", importName), getLocation());
                }
            }
            builder.setImports(imports);
        }

        String aliases = getAttributeValue(ATTRIBUTE_ALIASES);
        if (!AuraTextUtil.isNullEmptyOrWhitespace(aliases)) {
        	List<String> aliasList = Arrays.asList(aliases.trim().split("\\s*\\,\\s*"));
            builder.setAliases(aliasList);
        }

        String export = getAttributeValue(ATTRIBUTE_EXPORT);
        if (!AuraTextUtil.isNullEmptyOrWhitespace(export)) {
            builder.setExport(export);
        }

        builder.setDescription(getAttributeValue(RootTagHandler.ATTRIBUTE_DESCRIPTION));

        int next = xmlReader.next();
        if (next != XMLStreamConstants.END_ELEMENT || !TAG.equalsIgnoreCase(getTagName())) {
            error("expected end of %s tag", TAG);
        }

        builder.setOwnHash(source.getHash());
        builder.setAccess(new DefinitionAccessImpl(Access.PRIVATE));
        return builder.build();
    }

    @Override
    public Set<String> getAllowedAttributes() {
        return ALLOWED_ATTRIBUTES;
    }

    @Override
    public String getHandledTag() {
        return TAG;
    }
}
