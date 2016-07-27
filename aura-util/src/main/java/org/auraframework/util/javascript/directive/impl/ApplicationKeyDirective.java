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
package org.auraframework.util.javascript.directive.impl;

import java.io.IOException;
import java.util.EnumSet;

import org.auraframework.util.javascript.directive.DirectiveBasedJavascriptGroup;
import org.auraframework.util.javascript.directive.JavascriptGeneratorMode;
import org.auraframework.util.json.Json;

/**
 * inserts a list of application keys From Json.ApplicationKey
 */
public class ApplicationKeyDirective extends DirectiveImpl {

    public ApplicationKeyDirective(int offset, String line) {
        super(offset, line);
    }

    @Override
    protected EnumSet<JavascriptGeneratorMode> getDefaultModes() {
        return EnumSet.allOf(JavascriptGeneratorMode.class);
    }

    @Override
    public void processDirective(DirectiveBasedJavascriptGroup parser) throws IOException {
    }

    @Override
    public String generateOutput(JavascriptGeneratorMode mode) {
        StringBuilder sb=new StringBuilder();
        for(Json.ApplicationKey key: Json.ApplicationKey.values()){
            sb.append(String.format("%s:\"%s\",",key.name(),key));
        }
        sb.deleteCharAt(sb.length()-1);
        return sb.toString();
    }

}
