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
package org.auraframework.impl.java;

import java.io.File;

import org.auraframework.builder.DefBuilder;

import org.auraframework.def.DefDescriptor;
import org.auraframework.def.Definition;
import org.auraframework.impl.source.file.FileSource;
import org.auraframework.impl.system.DefFactoryImpl;
import org.auraframework.system.Parser.Format;
import org.auraframework.system.Source;

import org.auraframework.throwable.quickfix.QuickFixException;
import org.auraframework.util.AuraTextUtil;

/**
 */
public abstract class BaseJavaDefFactory<D extends Definition> extends DefFactoryImpl<D> {
    @Override
    public Source<D> getSource(DefDescriptor<D> descriptor) {
        Class<?> clazz = getClazz(descriptor);
        try {

            File base = new File(clazz.getProtectionDomain().getCodeSource().getLocation().toURI());
            base = new File(base, "../src");
            String pkg = AuraTextUtil.replaceChar(descriptor.getNamespace(), '.', "/") + "/";
            String clzFile = String.format("%s%s.java", pkg, descriptor.getName());
            File file = new File(base, clzFile);
            return new FileSource<D>(descriptor, file, Format.JAVA);
        } catch (Throwable x) {
        }
        return null;
    }

    protected Class<?> getClazz(DefDescriptor<D> descriptor){
        Class<?> clazz;
        try {
            if(descriptor.getNamespace() == null){
                clazz = Class.forName(descriptor.getName());
            }else{
                clazz = Class.forName(String.format("%s.%s", descriptor.getNamespace(), descriptor.getName()));
            }
        } catch (ClassNotFoundException e) {
            return null;
        }
        return clazz;
    }

    /**
     * Get a builder for the def.
     *
     * This function must be implemented by all subclasses. It should return
     * a builder from which only the 'build()' function will be executed.
     * It is allowed to return a null, in which case the
     * {@link #getDef(DefDescriptor)} function will return a null.
     *
     * Note that this can throw a QuickFixException as there are certain things
     * that will cause a builder to fail early. It would be possible to force them
     * to be lazy, but that doesn't really help anything. An example is a class
     * that does not have the correct annotation on it.
     *
     * @param descriptor the incoming descriptor for which we need a builder.
     * @return a builder for the Def or null if none could be found.
     * @throws QuickFixException if the builder could not be created because of a defect.
     */
    protected abstract DefBuilder<?, ? extends D> getBuilder(DefDescriptor<D> descriptor) throws QuickFixException;

    @Override
    public D getDef(DefDescriptor<D> descriptor) throws QuickFixException {
        DefBuilder<?, ? extends D> builder;
        D def;

        builder = getBuilder(descriptor);
        if (builder == null) {
            return null;
        }
        def = builder.build();
        return def;
    }
}
