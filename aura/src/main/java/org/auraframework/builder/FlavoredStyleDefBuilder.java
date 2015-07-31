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
package org.auraframework.builder;

import java.util.Map;

import org.auraframework.css.FlavorAnnotation;
import org.auraframework.def.FlavoredStyleDef;

/**
 * Builder for flavor css files.
 */
public interface FlavoredStyleDefBuilder extends BaseStyleDefBuilder<FlavoredStyleDef> {
    /**
     * Sets the specific flavor metadata defined by the source.
     */
    FlavoredStyleDefBuilder setFlavorAnnotations(Map<String, FlavorAnnotation> annotations);
}
