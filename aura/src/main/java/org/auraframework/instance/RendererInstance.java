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
package org.auraframework.instance;

import org.auraframework.def.RendererDef;
import org.auraframework.throwable.quickfix.QuickFixException;

import java.io.IOException;

/**
 * Instance of a Renderer
 */
public interface RendererInstance extends Instance<RendererDef> {
    /**
     * Render a component.
     *
     * @param component  The instance to render.
     * @param appendable the output buffer
     * @throws IOException       if the appendable does.
     * @throws QuickFixException if there is a quick fix.
     */
    public void render(BaseComponent<?, ?> component, Appendable appendable) throws IOException, QuickFixException;
}
