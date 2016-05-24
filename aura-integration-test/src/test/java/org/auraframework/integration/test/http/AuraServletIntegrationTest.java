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
package org.auraframework.integration.test.http;

import org.auraframework.adapter.ConfigAdapter;
import org.auraframework.adapter.ServletUtilAdapter;
import org.auraframework.def.ApplicationDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.http.ManifestUtil;
import org.auraframework.integration.test.util.IntegrationTestCase;
import org.auraframework.system.AuraContext.Authentication;
import org.auraframework.system.AuraContext.Format;
import org.auraframework.system.AuraContext.Mode;
import org.auraframework.util.test.annotation.ThreadHostileTest;
import org.junit.Test;

import javax.inject.Inject;

/**
 * Tests for AuraServlet.
 *
 * @since 0.0.2.48
 */
public class AuraServletIntegrationTest extends IntegrationTestCase {
    @Inject
    private ConfigAdapter configAdapter;

    @Inject
    private ServletUtilAdapter servletUtilAdapter;

    /**
     * check manifest URL when context has no preloads.
     */
    @Test
    public void testGetManifestWithoutPreloads() throws Exception {
        DefDescriptor<ApplicationDef> desc = definitionService.getDefDescriptor(
                "appCache:nopreload", ApplicationDef.class);
        contextService.startContext(Mode.PROD, Format.HTML, Authentication.AUTHENTICATED, desc);
        assertTrue(new ManifestUtil(contextService, configAdapter).isManifestEnabled());
        String url = servletUtilAdapter.getManifestUrl(contextService.getCurrentContext(), null);
        assertEquals("/l/%7B%22mode%22%3A%22PROD%22%2C%22app%22%3A%22appCache%3Anopreload%22%2C%22test%22%3A%22org.auraframework.integration.test.http.AuraServletIntegrationTest.testGetManifestWithoutPreloads%22" + 
        		getLockerServiceContextValue() + "%7D/app.manifest", url);
    }

    /**
     * check manifest URL when context has preloads.
     */
    @ThreadHostileTest("preload sensitive")
    @Test
    public void testGetManifestWithPreloads() throws Exception {
        DefDescriptor<ApplicationDef> desc = definitionService.getDefDescriptor(
                "appCache:withpreload", ApplicationDef.class);
        contextService.startContext(Mode.PROD, Format.HTML, Authentication.AUTHENTICATED, desc);
        String url = servletUtilAdapter.getManifestUrl(contextService.getCurrentContext(), null);
        assertEquals("/l/%7B%22mode%22%3A%22PROD%22%2C%22app%22%3A%22appCache%3Awithpreload%22%2C%22test%22%3A%22org.auraframework.integration.test.http.AuraServletIntegrationTest.testGetManifestWithPreloads%22" + 
        		getLockerServiceContextValue() + "%7D/app.manifest", url);
    }
    
	private String getLockerServiceContextValue() {
		return configAdapter.isLockerServiceEnabled() ? "%2C%22ls%22%3A%22E%22" : "";
	}
}
