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
package org.auraframework.impl.css.parser;

import java.util.Set;

import org.auraframework.Aura;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.DefDescriptor.DefType;
import org.auraframework.def.Definition;
import org.auraframework.def.FlavoredStyleDef;
import org.auraframework.def.ResourceDef;
import org.auraframework.def.StyleDef;
import org.auraframework.impl.clientlibrary.handler.ResourceDefHandler;
import org.auraframework.impl.css.flavor.FlavoredStyleDefImpl;
import org.auraframework.impl.css.parser.CssPreprocessor.ParserConfiguration;
import org.auraframework.impl.css.parser.CssPreprocessor.ParserResult;
import org.auraframework.impl.css.style.StyleDefImpl;
import org.auraframework.impl.css.util.Styles;
import org.auraframework.system.Client;
import org.auraframework.system.Parser;
import org.auraframework.system.Source;
import org.auraframework.throwable.quickfix.QuickFixException;

import com.google.common.collect.ImmutableSet;

/**
 */
public final class StyleParser implements Parser {

    private static final StyleParser instance = new StyleParser(true);
    private static final StyleParser nonValidatingInstance = new StyleParser(false);

    public static final Set<String> allowedConditions;
    private final boolean doValidation;

    // build list of conditional permutations and allowed conditionals
    static {
        ImmutableSet.Builder<String> acBuilder = ImmutableSet.builder();
        for (Client.Type type : Client.Type.values()) {
            acBuilder.add(type.toString());
        }
        allowedConditions = acBuilder.build();
    }

    public static StyleParser getInstance() {
        return Aura.getConfigAdapter().validateCss() ? instance : nonValidatingInstance;
    }

    public static StyleParser getNonValidatingInstance() {
        return nonValidatingInstance;
    }

    protected StyleParser(boolean doValidation) {
        this.doValidation = doValidation;
    }

    public boolean shouldValidate(String name) {
        return name.toLowerCase().endsWith("template") ? false : doValidation;
    }

    @SuppressWarnings("unchecked")
    @Override
    public <D extends Definition> D parse(DefDescriptor<D> descriptor, Source<?> source) throws QuickFixException {
        ParserConfiguration parserConfig = CssPreprocessor
                .initial()
                .source(source.getContents())
                .resourceName(source.getSystemId())
                .allowedConditions(allowedConditions);

        if (descriptor.getDefType() == DefType.STYLE) {
            DefDescriptor<StyleDef> styleDescriptor = (DefDescriptor<StyleDef>) descriptor;

            String className = Styles.buildClassName(styleDescriptor);

            StyleDefImpl.Builder builder = new StyleDefImpl.Builder();
            builder.setDescriptor(styleDescriptor);
            builder.setLocation(source.getSystemId(), source.getLastModified());
            builder.setClassName(className);
            builder.setOwnHash(source.getHash());

            ParserResult result = parserConfig
                    .componentClass(className, shouldValidate(descriptor.getName()))
                    .themes(styleDescriptor)
                    .parse();

            builder.setContent(result.content());
            builder.setThemeExpressions(result.themeExpressions());
            return (D) builder.build();
        } else if (descriptor.getDefType() == DefType.FLAVORED_STYLE) {
            DefDescriptor<FlavoredStyleDef> flavorDescriptor = (DefDescriptor<FlavoredStyleDef>) descriptor;

            FlavoredStyleDefImpl.Builder builder = new FlavoredStyleDefImpl.Builder();
            builder.setDescriptor(flavorDescriptor);
            builder.setLocation(source.getSystemId(), source.getLastModified());
            builder.setOwnHash(source.getHash());

            ParserResult result = parserConfig
                    .themes(flavorDescriptor)
                    .flavors(flavorDescriptor)
                    .parse();

            builder.setContent(result.content());
            builder.setThemeExpressions(result.themeExpressions());
            builder.setFlavorNames(result.flavorNames());
            return (D) builder.build();
        } else if (descriptor.getDefType() == DefType.RESOURCE) {
            return (D) new ResourceDefHandler<>((DefDescriptor<ResourceDef>) descriptor,
                    (Source<ResourceDef>) source).createDefinition();
        }

        return null;
    }
}
