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
package org.auraframework.integration.test.renderer;

import static org.hamcrest.CoreMatchers.instanceOf;
import static org.junit.Assert.assertThat;

import java.io.StringWriter;

import org.auraframework.def.DefDescriptor;
import org.auraframework.def.RendererDef;
import org.auraframework.impl.AuraImplTestCase;
import org.auraframework.impl.javascript.renderer.JavascriptRendererDef;
import org.auraframework.impl.system.RenderContextImpl;
import org.auraframework.system.RenderContext;

/**
 * Test class to verify implementation of JavascriptRendererDef.
 */
public class JavascriptRendererDefTest extends AuraImplTestCase {
    public JavascriptRendererDefTest(String name) {
        super(name);
    }

    /**
     * Verify JavascriptRendererDef is non-local.
     */
    public void testIsLocalReturnsFalse() {
        RendererDef rendererDef =  (new JavascriptRendererDef.Builder()).build();
        assertFalse(rendererDef.isLocal());
    }

    public void testGetDescriptor() throws Exception {
        DefDescriptor<RendererDef> expectedRendererDesc = addSourceAutoCleanup(RendererDef.class, "({})");
        RendererDef rendererDef = definitionService.getDefinition(expectedRendererDesc);

        DefDescriptor<RendererDef> actualRendererDesc = rendererDef.getDescriptor();
        assertSame(expectedRendererDesc, actualRendererDesc);
    }

    /**
     * Verify UnsupportedOperationException is thrown when rendering component locally using client renderer
     */
    public void testThrownExceptionWhenUsingJSRendererLocally() throws Exception {
        RendererDef rendererDef = (new JavascriptRendererDef.Builder()).build();
        StringWriter sw = new StringWriter();
        RenderContext rc = new RenderContextImpl(sw, null);
        
        try {
            rendererDef.render(null, rc);
            fail("UnsupportedOperationException should be thrown when calling client render() in local.");
        } catch (Exception e) {
            checkExceptionFull(e, UnsupportedOperationException.class, null);
        }
    }

    public void testSerializeJavascriptRendererDef() throws Exception {
        String rendererJs =
                "({\n" +
                "    render: function(cmp) {},\n" +
                "    afterRender: function() {},\n" +
                "    rerender: function() {},\n"+
                "    unrender: function() {}\n" +
                "})";
        DefDescriptor<RendererDef> rendererDesc = addSourceAutoCleanup(RendererDef.class, rendererJs);
        RendererDef rendererDef = definitionService.getDefinition(rendererDesc);

        assertThat(rendererDef, instanceOf(JavascriptRendererDef.class));
        goldFileText(rendererDef.getCode());
    }

    public void testSerializeJavascriptRendererDefHasNoFunction() throws Exception {
        String rendererJs = "({ })";
        DefDescriptor<RendererDef> rendererDesc = addSourceAutoCleanup(RendererDef.class, rendererJs);
        RendererDef rendererDef = definitionService.getDefinition(rendererDesc);

        assertThat(rendererDef, instanceOf(JavascriptRendererDef.class));
        goldFileText(rendererDef.getCode());
    }
}
