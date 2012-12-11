/*
 * Copyright (C) 2012 salesforce.com, inc.
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
package org.auraframework.impl.context;

import java.util.List;
import java.util.Set;

import org.auraframework.Aura;
import org.auraframework.def.ApplicationDef;
import org.auraframework.def.ComponentDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.EventDef;
import org.auraframework.impl.AuraImplTestCase;
import org.auraframework.instance.Event;
import org.auraframework.system.AuraContext;
import org.auraframework.system.AuraContext.Access;
import org.auraframework.system.AuraContext.Format;
import org.auraframework.system.AuraContext.Mode;
import org.auraframework.test.annotation.UnAdaptableTest;
import org.auraframework.util.json.Json;

/**
 * Unit tests for AuraContextImpl.
 *
 * @hierarchy Aura.Basic
 * @priority high
 * @userStory a07B0000000DfxB
 */
public class AuraContextImplTest extends AuraImplTestCase {
    public AuraContextImplTest(String name){
        super(name);
    }
    /**
     * Verify the basic configuration in place for preloading namespaces.
     * AuraContextImpl keeps track of namespaces whose definitions should be preLoaded.
     * This test would act like a gold file for namespaces selected to be pre-loaded.
     * Be sure to consider what namespaces you are specifying for pre-loading.
     * @throws Exception
     * @userStory a07B0000000EYU4
     */
    public void testPreloadConfigurations()throws Exception{
        AuraContext lc = Aura.getContextService().getCurrentContext();

        Set<String> preloadNamespace = lc.getPreloads();
        //Verify that 'ui' and 'Aura' are always specified as standard preload namespaces
        // don't verify anything else as more preloads could be injected through adapters
        assertTrue("UI namespace not specified as standard preload namespace",preloadNamespace.contains("ui"));
        assertTrue("aura namespace not specified as standard preload namespace",preloadNamespace.contains("aura"));
    }

    /**
     * Verify methods on AuraContext to alter pre-load configurations.
     * @userStory a07B0000000EYU4
     */
    public void testPreloadConfigurationMethods()throws Exception{
        AuraContext lc = Aura.getContextService().getCurrentContext();
        lc.setPreloading(true);
        Set<String> preloadNamespace = lc.getPreloads();
        assertTrue("Preload namespace configuration could not be reset", preloadNamespace.size()==0);
        lc.addPreload("auratest");
        preloadNamespace = lc.getPreloads();
        assertTrue("Preload namespace configuration could not be changed", preloadNamespace.contains("auratest"));
    }

    /**
     * Verify the serialized format of a ComponentDef when it belongs to a pre-load namespace.
     * Components which belong to a pre-load namespace will only have the descriptor as part of their
     * ComponentDef. This descriptor will be used on the client side to obtain the full blown componentDef.
     */
    public void testComponentDefSerializedFormat() throws Exception{
        ApplicationDef cDef = Aura.getDefinitionService().getDefinition("preloadTest:test_Preload_Cmp_SameNameSpace", 
                ApplicationDef.class);
        Set<String> preloadNamespace = cDef.getPreloads();
        assertTrue(preloadNamespace.contains("preloadTest"));
        AuraContext lc = Aura.getContextService().getCurrentContext();
        lc.addPreload("preloadTest");
        assertEquals("{\"descriptor\":\"markup://preloadTest:test_Preload_Cmp_SameNameSpace\"}",Json.serialize(cDef));
    }

    /**
     * Verify trying to set Preloading flag in context to TRUE.
     * AuraContext.preloading indicates whether components defs are currently being preloaded.
     * If the flag is true, all defs must be serialized in full form.
     * If the flag is false, all defs which are part of preload namespace are serialized partially.
     */
    public void testClearPreloadsBySetPreloadingToTrue() throws Exception{
        AuraContext lc = Aura.getContextService().getCurrentContext();
        lc.setPreloading(true);
        Set<String> preloadNamespace = lc.getPreloads();
        assertEquals("Setting preloading to true should clear the context of all preload namespaces.",
                0, preloadNamespace.size());
    }
    /**
     * Verify trying to set Preloading flag in context to false.
     * @throws Exception
     */
    public void testUnclearPreloadsBySetPreloadingToFalse()throws Exception{
        AuraContext lc = Aura.getContextService().getCurrentContext();
        Set<String> preloadNamespace = lc.getPreloads();
        //Verify that 'ui' and 'Aura' are always specified as standard preload namespaces
        // don't verify anything else as more preloads could be injected through adapters
        assertTrue(preloadNamespace.size()>=2);

        //At this point Context already has 2 namespaces preloaded, setting it further to true should have no effect
        lc.setPreloading(false);
        preloadNamespace = lc.getPreloads();
        assertTrue(preloadNamespace.size()>=2);
        assertTrue("UI namespace not specified as standard preload namespace",preloadNamespace.contains("ui"));
        assertTrue("aura namespace not specified as standard preload namespace",preloadNamespace.contains("aura"));

        lc.setPreloading(true);
        assertEquals("Setting preloading to true should clear the context of all preload namespaces.",
                0, lc.getPreloads().size());

        lc.setPreloading(false);
        preloadNamespace = lc.getPreloads();
        assertTrue("Context did not recover preload namespace information.",preloadNamespace.size()>=2);
        assertTrue("Context did not recover preload namespace information.",preloadNamespace.contains("ui"));
        assertTrue("Context did not recover preload namespace information.",preloadNamespace.contains("aura"));

    }

    /**
     * Context app descriptor gets serialized.
     */
    @UnAdaptableTest
    public void testSerializeWithApp() throws Exception {
        DefDescriptor<ApplicationDef> desc = Aura.getDefinitionService().getDefDescriptor("arbitrary:appname", 
                ApplicationDef.class);

        AuraContext ctx = Aura.getContextService().startContext(Mode.PROD, Format.JSON, Access.PUBLIC, desc);
        ctx.setSerializeLastMod(false);
        String res = Json.serialize(ctx, ctx.getJsonSerializationContext());
        assertEquals("{\"mode\":\"PROD\",\"app\":\"arbitrary:appname\",\"preloads\":[]," +
        		"\"globalValueProviders\":[{\"type\":\"$Locale\"}]}", res);
    }

    /**
     * Context app descriptor gets serialized.
     */
    @UnAdaptableTest
    public void testSerializeWithCmp() throws Exception {
        DefDescriptor<ComponentDef> desc = Aura.getDefinitionService().getDefDescriptor("arbitrary:cmpname", ComponentDef.class);

        AuraContext ctx = Aura.getContextService().startContext(Mode.PROD, Format.JSON, Access.PUBLIC, desc);
        ctx.setSerializeLastMod(false);
        String res = Json.serialize(ctx, ctx.getJsonSerializationContext());
        assertEquals("{\"mode\":\"PROD\",\"cmp\":\"arbitrary:cmpname\",\"preloads\":[],\"globalValueProviders\":[{\"type\":\"$Locale\"}]}", res);
    }

    /**
     * App not serialized for context without descriptor.
     */
    @UnAdaptableTest
    public void testSerializeWithoutApp() throws Exception {
        AuraContext ctx = Aura.getContextService().startContext(Mode.PROD, Format.JSON, Access.PUBLIC);
        ctx.setSerializeLastMod(false);
        String res = Json.serialize(ctx, ctx.getJsonSerializationContext());
        assertEquals("{\"mode\":\"PROD\",\"preloads\":[],\"globalValueProviders\":[{\"type\":\"$Locale\"}]}", res);
    }

    /**
     * Verify setting a Context's DefDescriptor.
     */
    @UnAdaptableTest
    public void testSetApplicationDescriptor() throws Exception {
        DefDescriptor<ApplicationDef> descApp1 = Aura.getDefinitionService().getDefDescriptor("arbitrary:appnameApp1",
                ApplicationDef.class);
        DefDescriptor<ApplicationDef> descApp2 = Aura.getDefinitionService().getDefDescriptor("arbitrary:appnameApp2",
                ApplicationDef.class);
        DefDescriptor<ComponentDef> descCmp = Aura.getDefinitionService().getDefDescriptor("arbitrary:cmpname",
                ComponentDef.class);

        AuraContext ctx = Aura.getContextService().startContext(Mode.PROD, Format.JSON, Access.PUBLIC);
        ctx.setSerializeLastMod(false);

        ctx.setApplicationDescriptor(descCmp);
        assertEquals("ComponentDef should override a Context's null DefDescriptor", descCmp,
                ctx.getApplicationDescriptor());

        ctx.setApplicationDescriptor(descApp1);
        assertEquals("ApplicationDef should override a Context's ComponentDef", descApp1,
                ctx.getApplicationDescriptor());

        ctx.setApplicationDescriptor(descApp2);
        assertEquals("ApplicationDef should override current Context's ApplicationDef", descApp2,
                ctx.getApplicationDescriptor());

        ctx.setApplicationDescriptor(descCmp);
        assertEquals("ComponentDef should not override current Context's ApplicationDef", descApp2,
                ctx.getApplicationDescriptor());
    }

    /**
     * Add events to context.
     * Technique used by controllers to add events and send them down with action response.
     * @throws Exception
     */
    public void testAttachingEvents() throws Exception {
        // Verify that nulls are filtered
        AuraContext lc = Aura.getContextService().getCurrentContext();
        try {
            lc.addClientApplicationEvent(null);
            assertEquals("Should not be accepting null objects as events.", 0, lc.getClientEvents().size());
        } catch (Exception e) {
            fail("Context.addClientApplicationEvent() does not handle nulls.");
        }
        Aura.getContextService().endContext();

        // Adding multiple contexts
        lc = Aura.getContextService().startContext(Mode.UTEST, Format.JSON, Access.AUTHENTICATED);
        Event evt1 = Aura.getInstanceService().getInstance("markup://aura:applicationEvent", EventDef.class, null);
        lc.addClientApplicationEvent(evt1);
        Event evt2 = Aura.getInstanceService().getInstance("markup://aura:noConnection", EventDef.class, null);
        lc.addClientApplicationEvent(evt2);
        List<Event> evnts = lc.getClientEvents();
        assertEquals("Found unexpected number of events on context", 2, evnts.size());
        assertEquals("markup://aura:applicationEvent", evnts.get(0).getDescriptor().getQualifiedName());
        assertEquals("markup://aura:noConnection", evnts.get(1).getDescriptor().getQualifiedName());
        Aura.getContextService().endContext();

        // Adding same event again should not cause an error, same event can be fired with different parameters.
        lc = Aura.getContextService().startContext(Mode.UTEST, Format.JSON, Access.AUTHENTICATED);
        Event evt3 = Aura.getInstanceService().getInstance("markup://handleEventTest:applicationEvent",
                EventDef.class, null);
        lc.addClientApplicationEvent(evt3);
        Event evt3_dup = Aura.getInstanceService().getInstance("markup://handleEventTest:applicationEvent",
                EventDef.class, null);
        lc.addClientApplicationEvent(evt3_dup);
        assertEquals("Failed to add same event twice.", 2, evnts.size());
        Aura.getContextService().endContext();

        // Verify component events are not acceptable
        lc = Aura.getContextService().startContext(Mode.UTEST, Format.JSON, Access.AUTHENTICATED);
        Event evt4 = Aura.getInstanceService().getInstance("markup://handleEventTest:event", EventDef.class, null);
        try {
            lc.addClientApplicationEvent(evt4);
            fail("Component events should not be allowed to be fired from server.");
        } catch (Exception e) {
            assertEquals("markup://handleEventTest:event is not an Application event. " +
                    "Only Application events are allowed to be fired from server.",
                    e.getMessage());
        }
    }
}
