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
package org.auraframework.impl;

import java.io.File;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantReadWriteLock.WriteLock;

import junit.framework.Assert;

import org.auraframework.Aura;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.Definition;
import org.auraframework.impl.source.StringSourceLoader;
import org.auraframework.impl.system.MasterDefRegistryImpl;
import org.auraframework.impl.util.AuraImplFiles;
import org.auraframework.system.AuraContext;
import org.auraframework.system.Source;
import org.auraframework.test.AuraTestingUtil;
import org.auraframework.test.util.AuraPrivateAccessor;

import com.google.common.collect.Sets;

public class AuraTestingUtilImpl implements AuraTestingUtil {
    private final Set<DefDescriptor<?>> cleanUpDds = Sets.newHashSet();
    private static AtomicLong nonce = new AtomicLong(System.currentTimeMillis());

    public AuraTestingUtilImpl() {
    }

    @Override
    public void setUp() {
        // Do nothing
    }

    @Override
    public void tearDown() {
        // wait for registry lock to avoid deadlocks (max 5 secs)
        WriteLock lock = null;
        try {
            lock = AuraPrivateAccessor.get(MasterDefRegistryImpl.class, "wLock");
            if(!lock.tryLock()){
                lock.tryLock(5, TimeUnit.SECONDS);
            }
        } catch (Throwable t) {
            t.printStackTrace();
            Assert.fail("Failed getting lock to clean up string sources");
        }

        try {
            StringSourceLoader loader = StringSourceLoader.getInstance();
            for (DefDescriptor<?> dd : cleanUpDds) {
                loader.removeSource(dd);
            }
            cleanUpDds.clear();
        } finally {
            lock.unlock();
        }
    }


    @Override
    public File getAuraJavascriptSourceDirectory() {
        return AuraImplFiles.AuraJavascriptSourceDirectory.asFile();
    }

    @Override
    public String getNonce() {
        return Long.toString(nonce.incrementAndGet());
    }

    @Override
    public String getNonce(String prefix) {
        return (prefix == null ? "" : prefix) + getNonce();
    }

    @Override
    public <T extends Definition> Source<T> getSource(DefDescriptor<T> descriptor) {
        // Look up in the registry if a context is available. Otherwise, we're
        // probably running a context-less unit test
        // and better be using StringSourceLoader
        AuraContext context = Aura.getContextService().getCurrentContext();
        if (context != null) {
            return context.getDefRegistry().getSource(descriptor);
        } else {
            return StringSourceLoader.getInstance().getSource(descriptor);
        }
    }

    @Override
    public <T extends Definition> DefDescriptor<T> addSourceAutoCleanup(Class<T> defClass, String contents) {
        return addSourceAutoCleanup(defClass, contents, null);
    }

    @Override
    public <T extends Definition> DefDescriptor<T> addSourceAutoCleanup(Class<T> defClass, String contents,
            String namePrefix) {
        StringSourceLoader loader = StringSourceLoader.getInstance();
        DefDescriptor<T> descriptor = loader.addSource(defClass, contents, namePrefix).getDescriptor();
        cleanUpDds.add(descriptor);
        return descriptor;
    }

    @Override
    public <T extends Definition> DefDescriptor<T> addSourceAutoCleanup(DefDescriptor<T> descriptor, String contents) {
        StringSourceLoader loader = StringSourceLoader.getInstance();
        loader.putSource(descriptor, contents, false);
        cleanUpDds.add(descriptor);
        return descriptor;
    }
}
