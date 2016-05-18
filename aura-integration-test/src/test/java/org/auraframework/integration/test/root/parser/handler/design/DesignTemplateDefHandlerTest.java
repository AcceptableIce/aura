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
package org.auraframework.integration.test.root.parser.handler.design;

import org.auraframework.def.ComponentDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.design.DesignDef;
import org.auraframework.def.design.DesignTemplateDef;
import org.auraframework.impl.AuraImplTestCase;
import org.auraframework.throwable.quickfix.InvalidDefinitionException;
import org.junit.Test;

public class DesignTemplateDefHandlerTest extends AuraImplTestCase {
    public DesignTemplateDefHandlerTest(String name) {
        super(name);
    }

    @Test
    public void testGetElement() throws Exception {
        DesignTemplateDef element = setupDesignTemplateDef("<design:template><design:region name=\"regionone\"/></design:template>");
        assertNotNull(element.getDesignTemplateRegionDef("regionone"));
    }

    @Test
    public void testGetEmptyTemplate() throws Exception {
        DesignTemplateDef element = setupDesignTemplateDef("<design:template></design:template>");
        assertTrue(element.getDesignTemplateRegionDefs().isEmpty());
    }

    @Test
    public void testInvalidSystemAttributeName() throws Exception {
        try {
            setupDesignTemplateDef("<design:template name=\"template\" foo=\"bar\" />");
            fail("Expected InvalidDefinitionException to be thrown");
        } catch (Exception t) {
            assertExceptionMessageEndsWith(t, InvalidDefinitionException.class, "Invalid attribute \"foo\"");
        }
    }

    @Test
    public void testInvalidSystemAttributePrefix() throws Exception {
        try {
            setupDesignTemplateDef("<design:template name=\"template\" other:name=\"asdf\" />");
            fail("Expected InvalidDefinitionException to be thrown");
        } catch (Exception t) {
            assertExceptionMessageEndsWith(t, InvalidDefinitionException.class,
                    "Invalid attribute \"other:name\"");
        }
    }

    private DesignTemplateDef setupDesignTemplateDef(String markup) throws Exception {
        DefDescriptor<ComponentDef> cmpDesc = getAuraTestingUtil().createStringSourceDescriptor(null,
                ComponentDef.class, null);
        String cmpBody = "<aura:attribute name='mystring' type='String' />";
        addSourceAutoCleanup(cmpDesc, String.format(baseComponentTag, "", cmpBody));

        DefDescriptor<DesignDef> designDesc = definitionService.getDefDescriptor(cmpDesc.getQualifiedName(),
                DesignDef.class);
        addSourceAutoCleanup(designDesc, String.format("<design:component>%s</design:component>", markup));

        return designDesc.getDef().getDesignTemplateDef();
    }
}
