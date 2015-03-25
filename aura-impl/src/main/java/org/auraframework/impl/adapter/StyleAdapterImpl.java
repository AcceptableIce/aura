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
package org.auraframework.impl.adapter;

import java.util.ArrayList;
import java.util.List;

import org.auraframework.Aura;
import org.auraframework.adapter.StyleAdapter;
import org.auraframework.css.ResolveStrategy;
import org.auraframework.css.ThemeList;
import org.auraframework.css.ThemeValueProvider;
import org.auraframework.def.BaseStyleDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.ds.serviceloader.AuraServiceProvider;
import org.auraframework.impl.css.parser.plugin.DuplicateFontFacePlugin;
import org.auraframework.impl.css.theme.ThemeValueProviderImpl;

import com.google.common.collect.ImmutableList;
import com.salesforce.omakase.plugin.Plugin;

import aQute.bnd.annotation.component.Component;

@Component(provide = AuraServiceProvider.class)
public class StyleAdapterImpl implements StyleAdapter {

    @Override
    public ThemeValueProvider getThemeValueProvider(DefDescriptor<? extends BaseStyleDef> style) {
        return getThemeValueProvider(style, ResolveStrategy.RESOLVE_NORMAL);
    }

    @Override
    public ThemeValueProvider getThemeValueProvider(DefDescriptor<? extends BaseStyleDef> style, ResolveStrategy strategy) {
        switch (strategy) {
        case RESOLVE_NORMAL:
            return getThemeValueProvider(style, strategy, Aura.getContextService().getCurrentContext().getThemeList());
        case RESOLVE_DEFAULTS:
        case PASSTHROUGH:
            return getThemeValueProvider(style, strategy, null);
        }

        return null;
    }

    @Override
    public ThemeValueProvider getThemeValueProvider(DefDescriptor<? extends BaseStyleDef> style, ResolveStrategy strategy,
            ThemeList overrides) {
        return new ThemeValueProviderImpl(style, overrides, strategy);
    }

    @Override
    public List<Plugin> getCompilationPlugins() {
        return ImmutableList.<Plugin>of();
    }

    @Override
    public List<Plugin> getRuntimePlugins() {
        return ImmutableList.<Plugin>of();
    }

    @Override
    public List<Plugin> getContextualRuntimePlugins() {
        List<Plugin> plugins = new ArrayList<>(1);

        // when pre-compilation is ready, this should probably be there instead
        // also when we move to multiple app.css files, need to revisit this
        plugins.add(new DuplicateFontFacePlugin());

        return plugins;
    }
}
