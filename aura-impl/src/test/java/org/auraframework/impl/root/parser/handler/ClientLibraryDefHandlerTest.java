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

import com.google.common.collect.Sets;
import org.auraframework.def.ClientLibraryDef;
import org.auraframework.def.ClientLibraryDef.Type;
import org.auraframework.def.ComponentDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.impl.AuraImplTestCase;
import org.auraframework.impl.root.parser.ComponentXMLParser;
import org.auraframework.system.AuraContext.Mode;
import org.auraframework.system.Parser.Format;
import org.auraframework.test.source.StringSource;
import org.auraframework.throwable.quickfix.InvalidDefinitionException;
import org.auraframework.util.FileMonitor;
import org.junit.Before;
import org.junit.Test;

import javax.inject.Inject;
import java.util.List;

/**
 * 
 * Unit tests for ClientLibraryDefHandler.
 */
public class ClientLibraryDefHandlerTest extends AuraImplTestCase {
    @Inject
    private FileMonitor fileMonitor;

    @Inject
    private ComponentXMLParser componentXMLParser;

    private DefDescriptor<ComponentDef> descriptor;

    @Before
    public void createDescriptor() {
        descriptor = definitionService.getDefDescriptor("test:fakeparser", ComponentDef.class);
    }

    @Test
    public void testNoTypeInLibraryTag() throws Exception {
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component><aura:clientLibrary name='HTML5Shiv'/></aura:component>",
                "myID", Format.XML);
        assertDefaultType(source, "When no type specified, JS should be the default");
    }

    @Test
    public void testEmptyTypeInLibraryTag() throws Exception {
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component><aura:clientLibrary name='HTML5Shiv' type='' /></aura:component>",
                "myID", Format.XML);
        assertDefaultType(source, "When empty type specified, JS should be the default");
    }

    private void assertDefaultType(StringSource<ComponentDef> source, String errorMsg) throws Exception {
        ComponentDef cmpDef = componentXMLParser.parse(descriptor, source);
        List<ClientLibraryDef> libraries = cmpDef.getClientLibraries();
        assertEquals(1, libraries.size());
        assertEquals(Type.JS, libraries.get(0).getType());
    }

    @Test
    public void testInvalidTypeInLibraryTag() throws Exception {
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component><aura:clientLibrary name='HTML5Shiv' type='fooBar' /></aura:component>",
                "myID", Format.XML);

        ComponentDef cd = componentXMLParser.parse(descriptor, source);
        try {
            cd.validateDefinition();
            fail("Should have failed on encountering bad type attribute");
        } catch (Exception e) {
            checkExceptionFull(e, InvalidDefinitionException.class, "Missing valid type");
        }
    }

    @Test
    public void testCommaSeparatedTypesInLibraryTag() throws Exception {
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component><aura:clientLibrary name='HTML5Shiv' type='JS, CSS' /></aura:component>",
                "myID", Format.XML);
        ComponentDef cd = componentXMLParser.parse(descriptor, source);
        try {
            cd.validateDefinition();
            fail("Should accept only valid types for type attribute.");
        } catch (Exception e) {
            checkExceptionFull(e, InvalidDefinitionException.class, "Missing valid type");
        }
    }

    @Test
    public void testNoModeSpecifiedInLibraryTag() throws Exception {
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component>" +
                "<aura:clientLibrary name='HTML5Shiv' type='JS' />" +
                "</aura:component>",
                "myID", Format.XML);
        ComponentDef cmpDef = componentXMLParser.parse(descriptor, source);
        List<ClientLibraryDef> libraries = cmpDef.getClientLibraries();
        assertEquals(1, libraries.size());
        ClientLibraryDef cld1 = libraries.get(0);
        assertTrue(cld1.getModes().isEmpty());
    }

    @Test
    public void testModesSpecifiedInLibraryTag() throws Exception {
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component>" +
                "<aura:clientLibrary name='HTML5Shiv' type='JS' modes='DEV'/>" +
                "</aura:component>",
                "myID", Format.XML);
        ComponentDef cmpDef = componentXMLParser.parse(descriptor, source);
        List<ClientLibraryDef> libraries = cmpDef.getClientLibraries();
        assertEquals(1, libraries.size());

        ClientLibraryDef cld1 = libraries.get(0);
        assertEquals(1, cld1.getModes().size());
        assertTrue(cld1.getModes().contains(Mode.DEV));
        assertEquals(Sets.newHashSet(Mode.DEV), cld1.getModes());
    }

    @Test
    public void testInvalidModeSpecificationInLibraryTag() throws Exception {
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component>" +
                "<aura:clientLibrary name='HTML5Shiv' type='JS' modes='fooBar'/>" +
                "</aura:component>",
                "myID", Format.XML);
        ComponentDef cd = componentXMLParser.parse(descriptor, source);
        try {
        	cd.validateDefinition();
            fail("Should not accept invalid mode specification.");
        } catch (Exception e) {
            checkExceptionFull(e, InvalidDefinitionException.class, "Invalid mode specified");
        }
    }

    @Test
    public void testDefaultValueForCombine() throws Exception{
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component>" +
                        "<aura:clientLibrary name='HTML5Shiv' type='JS' modes='DEV'/>" +
                "</aura:component>",
                "myID", Format.XML);
        ComponentDef cmpDef = componentXMLParser.parse(descriptor, source);
        List<ClientLibraryDef> libraries = cmpDef.getClientLibraries();
        assertEquals(1, libraries.size());

        ClientLibraryDef cld1 = libraries.get(0);
        assertFalse(cld1.shouldCombine());
    }

    @Test
    public void testCombinesReadableResources()throws Exception{
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component>" +
                "<aura:clientLibrary name='HTML5Shiv' type='JS' combine='true'/>" + //0
                "<aura:clientLibrary url='js://clientLibraryTest.clientLibraryTest' type='JS' combine='true'/>" + //1
                "<aura:clientLibrary url='css://clientLibraryTest.clientLibraryTest' type='CSS' combine='true' />" + //2
                "<aura:clientLibrary url='/jslibrary/baselogin.js' combine='true'/>" + //3
                "<aura:clientLibrary url='jslibrary/abc/sfdc/Zen.js' combine='true'/>" + //4
                "<aura:clientLibrary url='//jslibrary/abc/sfdc/Alto.js' combine='true'/>" + //5
                "<aura:clientLibrary url='https://www.likeaboss.com/jslibrary/xyz/sfdc/Zen.js' combine='true'/>" + //6
                "<aura:clientLibrary url='http://www.likeaboss.com/jslibrary/xyz/sfdc/Zen.js' combine='true'/>" + //7
                "</aura:component>",
                "myID", Format.XML);
        ComponentDef cmpDef = componentXMLParser.parse(descriptor, source);
        List<ClientLibraryDef> libraries = cmpDef.getClientLibraries();
        assertEquals(8, libraries.size());
        ClientLibraryDef cld;
        for(int i= 0; i< 3; i++){
             cld = libraries.get(i);
            assertTrue(i + " should be combine", cld.shouldCombine());
        }
        for(int i= 3; i< 8; i++){
            cld = libraries.get(i);
           assertFalse(i + " should not combine", cld.shouldCombine());
       }
    }

    @Test
    public void testDoNotCombineLibrariesIfMarkedSo() throws Exception{
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component>" +
                "<aura:clientLibrary name='HTML5Shiv' type='JS' combine='false'/>" + //1
                "<aura:clientLibrary url='/jslibrary/baselogin.js' combine='false'/>" + //2
                "<aura:clientLibrary url='jslibrary/abc/sfdc/Zen.js' combine='false'/>" + //3
                "<aura:clientLibrary url='//jslibrary/abc/sfdc/Alto.js' combine='false'/>" + //4
                "<aura:clientLibrary url='https://www.likeaboss.com/jslibrary/xyz/sfdc/Zen.js' combine='false'/>" + //5
                "<aura:clientLibrary url='http://www.likeaboss.com/jslibrary/xyz/sfdc/Zen.js' combine='false'/>" + //6
                "</aura:component>",
                "myID", Format.XML);
        ComponentDef cmpDef = componentXMLParser.parse(descriptor, source);
        List<ClientLibraryDef> libraries = cmpDef.getClientLibraries();
        assertEquals(6, libraries.size());
        ClientLibraryDef cld;
        for(int i= 0; i< 6; i++){
             cld = libraries.get(i);
            assertFalse(cld.shouldCombine());
        }
    }

    @Test
    public void testComponentResourcesAreAlwaysCombined() throws Exception{
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component>" +
                "<aura:clientLibrary url='js://clientLibraryTest.clientLibraryTest' type='JS' combine='false'/>" + //2
                "<aura:clientLibrary url='css://clientLibraryTest.clientLibraryTest' type='CSS' combine='false' />" + //3
                "</aura:component>",
                "myID", Format.XML);
        ComponentDef cmpDef = componentXMLParser.parse(descriptor, source);
        List<ClientLibraryDef> libraries = cmpDef.getClientLibraries();
        assertEquals(2, libraries.size());
        ClientLibraryDef cld;
        for(int i= 0; i< 2; i++){
             cld = libraries.get(i);
            assertTrue(cld.shouldCombine());
        }
    }

    @Test
    public void testDefaultValueForUrl() throws Exception{
        StringSource<ComponentDef> source = new StringSource<>(fileMonitor,
                descriptor, "<aura:component>" +
                "<aura:clientLibrary name='HTML5Shiv' type='JS' modes='DEV'/>" +
                "</aura:component>",
                "myID", Format.XML);
        ComponentDef cmpDef = componentXMLParser.parse(descriptor, source);
        List<ClientLibraryDef> libraries = cmpDef.getClientLibraries();
        assertEquals(1, libraries.size());

        ClientLibraryDef cld = libraries.get(0);
        assertEquals("", cld.getUrl());
    }
}
