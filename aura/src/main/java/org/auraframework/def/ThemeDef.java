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
package org.auraframework.def;

import org.auraframework.throwable.quickfix.QuickFixException;

import com.google.common.base.Optional;

/**
 * {@link ThemeDef}s are top-level tags that contain a set of attributes. They provide the information necessary to
 * perform theme variable substitution in stylesheets.
 * 
 * @author nmcwilliams
 */
public interface ThemeDef extends RootDefinition {
    @Override
    DefDescriptor<ThemeDef> getDescriptor();

    /**
     * Gets the value of a variable.
     * 
     * @param name Name of the variable/attribute.
     * @throws QuickFixException if a parent descriptor does not exist
     * @returns The variable value, or {@link Optional#absent()} if no variable exists for the given name.
     */
    Optional<String> variable(String name) throws QuickFixException;

    /**
     * Gets the descriptor of the {@link ThemeDef} this one extends, or null if not specified.
     */
    DefDescriptor<ThemeDef> getExtendsDescriptor();
}
