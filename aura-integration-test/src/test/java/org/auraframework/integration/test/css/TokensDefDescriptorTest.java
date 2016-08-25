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
package org.auraframework.integration.test.css;

import org.auraframework.def.DefDescriptor;
import org.auraframework.def.DefDescriptor.DefType;
import org.auraframework.def.TokensDef;
import org.auraframework.service.DefinitionService;
import org.auraframework.util.test.util.UnitTestCase;
import org.junit.Test;

import javax.inject.Inject;

/**
 * Unit tests for {@link TokensDef} {@link DefDescriptor}s.
 */
public class TokensDefDescriptorTest extends UnitTestCase {
    @Inject
    private DefinitionService definitionService;

    @Test
    public void testGetDefType() {
        DefDescriptor<TokensDef> testDescriptor = definitionService.getDefDescriptor("blah:blah", TokensDef.class);
        assertEquals(DefType.TOKENS, testDescriptor.getDefType());
    }
}
