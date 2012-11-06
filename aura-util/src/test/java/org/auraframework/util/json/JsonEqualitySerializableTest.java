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
package org.auraframework.util.json;

import java.io.IOException;

import org.auraframework.util.json.Json;
import org.auraframework.util.json.JsonSerializable;
import org.auraframework.util.json.Json.Serialization;
import org.auraframework.util.json.Json.Serialization.ReferenceType;

@Serialization(referenceType = ReferenceType.EQUALITY)
public class JsonEqualitySerializableTest implements JsonSerializable{

    private Integer value;

    public JsonEqualitySerializableTest(int value) {
        this.value = value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    @Override
    public int hashCode() {
        return value.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        if (obj instanceof JsonEqualitySerializableTest) {
            JsonEqualitySerializableTest other = (JsonEqualitySerializableTest)obj;
            return value == other.value;
        }
        return false;
    }

    @Override
    public void serialize(Json json) throws IOException {
        json.writeString("JsonEqualitySerializableTest serialized string");
    }

}
