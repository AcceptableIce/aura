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
package org.auraframework.util.json;

/**
 * don't use this, use jackson Context for serializing json using {@link Json}
 * with reference support.
 */
public interface JsonSerializationContext {

    /**
     * Truncate variable type (e.g. string, big decimal) data sizes to this
     * length, -1 to not truncate
     */
    int getVariableDataSizeLimit();

    /**
     * Don't render collections over this length, -1 to not truncate
     */
    int getCollectionSizeLimit();

    /**
     * @return format the output for humanity
     */
    boolean format();

    /**
     * @return Whether or not to write the items of a root collection on separate lines.
     */
    boolean formatRootItems();

    /**
     * Set a new state of root collection line separation, preserving the previous one.
     */
    void pushFormatRootItems();

    /**
     * Restore the previous state of root collection line separation.
     */
    void popFormatRootItems();

    /**
     * Get the serializer to use for the given object
     *
     * @return the serializer
     */
    <T> JsonSerializer<T> getSerializer(T o);

    /**
     * Returns whether or not null values in arrays and objects get written out.
     * By default, this is false.
     *
     * @return When false, array and object values that are null cause the entry
     *         to not get written out. When true, these are written out.
     */
    boolean isNullValueEnabled();

    /**
     * sets whether or not null values in arrays and objects get written out.
     *
     * By default, this is false. It should be treated as a stack.
     *
     * @param nullValueEnabled the new value to set.
     * @return the previous value.
     */
    boolean setNullValueEnabled(boolean nullValueEnabled);

    /**
     * Sets whether currently serializing
     *
     * @param serializing whether currently serializing
     */
    void setSerializing(boolean serializing);

    /**
     * Whether currently serializing
     *
     * @return true if currently serializing
     */
    boolean isSerializing();
}
