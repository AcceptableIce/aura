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
package org.auraframework.http.resource;

import org.auraframework.Aura;
import org.auraframework.adapter.ConfigAdapter;
import org.auraframework.annotations.Annotations.ServiceComponent;
import org.auraframework.system.AuraContext;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

/**
 * Handles /l/{}/app.encryptionkey requests to retrieve encryption key.
 */
@ServiceComponent
public class EncryptionKeyJs extends AuraResourceImpl {

    private ConfigAdapter configAdapter = Aura.getConfigAdapter();
    private final String PREPEND_JS = "window.Aura || (window.Aura = {});\nwindow.Aura.bootstrap || (window.Aura.bootstrap = {});\nwindow.Aura.Crypto = {};\nwindow.Aura.Crypto.key =";
    private final String APPEND_JS = ";\n(function () {\n\twindow.Aura.bootstrap.execEncryptionKey = window.performance && window.performance.now ? window.performance.now() : Date.now();\n\twindow.Aura.encryptionKeyReady = true;\n\tif (window.Aura.afterEncryptionKeyReady){\n\t\twindow.Aura.afterEncryptionKeyReady();\n\t}\n}());";

    public EncryptionKeyJs() {
        super("app.encryptionkey.js", AuraContext.Format.JS);
    }

    @Override
    public void write(HttpServletRequest request, HttpServletResponse response, AuraContext context) throws IOException {
    	servletUtilAdapter.setNoCache(response);
    	
        String key = configAdapter.getEncryptionKey();
        PrintWriter out = response.getWriter();
        out.append(PREPEND_JS);
        out.append(key);
        out.append(APPEND_JS);
    }
    
    public void setConfigAdapter(ConfigAdapter configAdapter) {
    	this.configAdapter = configAdapter;
    }
}
