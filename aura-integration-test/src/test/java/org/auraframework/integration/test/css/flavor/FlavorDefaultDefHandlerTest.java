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
package org.auraframework.integration.test.css.flavor;

import javax.xml.stream.XMLStreamReader;

import org.auraframework.Aura;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.FlavorAssortmentDef;
import org.auraframework.def.FlavorDefaultDef;
import org.auraframework.def.FlavorIncludeDef;
import org.auraframework.impl.css.StyleTestCase;
import org.auraframework.impl.root.parser.XMLParser;
import org.auraframework.impl.root.parser.handler.FlavorAssortmentDefHandler;
import org.auraframework.impl.root.parser.handler.FlavorDefaultDefHandler;
import org.auraframework.impl.source.StringSource;
import org.auraframework.system.Parser.Format;
import org.auraframework.throwable.AuraRuntimeException;

public class FlavorDefaultDefHandlerTest extends StyleTestCase {

    public FlavorDefaultDefHandlerTest(String name) {
        super(name);
    }

    public void testDescription() throws Exception {
        addStandardFlavor(addComponentDef(), ".THIS--test;");
        FlavorDefaultDef def = source("<aura:flavor component='*' default='x' description='testdesc'/>");
        assertEquals("testdesc", def.getDescription());
    }

    public void testInvalidChild() throws Exception {
        try {
            source("<aura:flavor component='x' default='test'><ui:button></aura:flavor>");
            fail("Should have thrown an exception");
        } catch (Exception e) {
            checkExceptionContains(e, AuraRuntimeException.class, "No children");
        }
    }

    public void testWithTextBetweenTag() throws Exception {
        try {
            source("<aura:flavor component='x' default='test'>blah</aura:flavor>");
            fail("Should have thrown an exception");
        } catch (Exception e) {
            checkExceptionContains(e, AuraRuntimeException.class, "No literal text");
        }
    }

    private FlavorDefaultDef source(String src) throws Exception {
        DefDescriptor<FlavorAssortmentDef> parentDesc = Aura.getDefinitionService().getDefDescriptor("test:tmp",
                FlavorAssortmentDef.class);
        StringSource<FlavorAssortmentDef> parentSource = new StringSource<>(parentDesc, "<aura:flavors/>", "myID", Format.XML);
        XMLStreamReader parentReader = XMLParser.getInstance().createXMLStreamReader(parentSource.getHashingReader());
        parentReader.next();
        FlavorAssortmentDefHandler parent = new FlavorAssortmentDefHandler(parentDesc, parentSource, parentReader);

        DefDescriptor<FlavorIncludeDef> desc = Aura.getDefinitionService().getDefDescriptor("test", FlavorIncludeDef.class);
        StringSource<FlavorIncludeDef> ss = new StringSource<>(desc, src, "myID", Format.XML);
        XMLStreamReader xmlReader = XMLParser.getInstance().createXMLStreamReader(ss.getHashingReader());
        xmlReader.next();
        FlavorDefaultDefHandler<FlavorAssortmentDef> handler = new FlavorDefaultDefHandler<>(parent, xmlReader, ss);
        return handler.getElement();
    }
}
