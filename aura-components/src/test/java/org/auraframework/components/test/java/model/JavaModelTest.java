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
package org.auraframework.components.test.java.model;

import org.auraframework.def.ComponentDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.Definition;
import org.auraframework.def.ModelDef;
import org.auraframework.def.ValueDef;
import org.auraframework.impl.AuraImplTestCase;
import org.auraframework.impl.expression.PropertyReferenceImpl;
import org.auraframework.impl.java.model.JavaModelDefFactory;
import org.auraframework.impl.system.DefDescriptorImpl;
import org.auraframework.instance.Model;
import org.auraframework.system.Annotations;
import org.auraframework.system.Location;
import org.auraframework.test.source.StringSourceLoader;
import org.auraframework.throwable.AuraExecutionException;
import org.auraframework.throwable.NoAccessException;
import org.auraframework.throwable.quickfix.DefinitionNotFoundException;
import org.auraframework.throwable.quickfix.InvalidDefinitionException;
import org.auraframework.util.json.Json;
import org.junit.Ignore;
import org.junit.Test;

import java.io.IOException;

/**
 * This class provides automation for Java models.
 *
 * @hierarchy Aura.Unit Tests.Components.Model.Java Model
 * @priority high
 */
public class JavaModelTest extends AuraImplTestCase {

    private static final DefDescriptor<ModelDef> descriptor = new DefDescriptor<ModelDef>() {
        private static final long serialVersionUID = -2368424955441005888L;

        @Override
        public void serialize(Json json) throws IOException {
            json.writeValue(getQualifiedName());
        }

        @Override
        public String getPrefix() {
            return "java";
        }

        @Override
        public String getNamespace() {
            return org.auraframework.components.test.java.model.TestModel.class.getPackage().getName();
        }

        @Override
        public String getName() {
            return org.auraframework.components.test.java.model.TestModel.class.getSimpleName();
        }

        @Override
        public String getQualifiedName() {
            return getPrefix() + "://" + org.auraframework.components.test.java.model.TestModel.class.getName();
        }

        @Override
        public String getDescriptorName() {
            return org.auraframework.components.test.java.model.TestModel.class.getName();
        }

        @Override
        public boolean isParameterized() {
            return false;
        }

        @Override
        public String getNameParameters() {
            return null;
        }

        @Override
        public org.auraframework.def.DefDescriptor.DefType getDefType() {
            return DefType.MODEL;
        }

        @Override
        public ModelDef getDef() {
            return null;
        }

        @Override
        public boolean exists() {
            return false;
        }

        @Override
        public int compareTo(DefDescriptor<?> other) {
            return DefDescriptorImpl.compare(this, other);
        }

        @Override
        public DefDescriptor<? extends Definition> getBundle() {
            return null;
        }
    };

    @Test
    public void testSerializeMetadata() throws Exception {
        JavaModelDefFactory factory = new JavaModelDefFactory();
        ModelDef def = factory.getDef(descriptor);
        serializeAndGoldFile(def);
    }

    @Test
    public void testSerializeData() throws Exception {
        JavaModelDefFactory factory = new JavaModelDefFactory(null);
        ModelDef def = factory.getDef(descriptor);
        Model model = def.newInstance();
        serializeAndGoldFile(model);
    }

    /**
     * Verify that class level annotation is required for a java model.
     *
     * @userStory a07B0000000FAmj
     */
    @Test
    public void testClassLevelAnnotationForJavaModel() throws Exception {
        DefDescriptor<ModelDef> javaModelDefDesc = definitionService.getDefDescriptor(
                "java://org.auraframework.components.test.java.model.TestModel", ModelDef.class);
        assertNotNull(javaModelDefDesc.getDef());

        DefDescriptor<ModelDef> javaModelWOAnnotationDefDesc = definitionService.getDefDescriptor(
                "java://org.auraframework.components.test.java.model.TestModelWithoutAnnotation", ModelDef.class);
        try {
            javaModelWOAnnotationDefDesc.getDef();
            fail("Expected InvalidDefinitionException");
        } catch (Exception e) {
            checkExceptionStart(e, InvalidDefinitionException.class, "@Model annotation is required on all Models.",
                    javaModelWOAnnotationDefDesc.getName());
        }
    }

    /**
     * Test subclassing.
     */
    @Test
    public void testModelSubclass() throws Exception {
        DefDescriptor<ModelDef> javaModelDefDesc = definitionService.getDefDescriptor(
                "java://org.auraframework.components.test.java.model.TestModelSubclass", ModelDef.class);
        ModelDef def = javaModelDefDesc.getDef();
        assertNotNull(def);
        Model model = def.newInstance();
        ValueDef vd = def.getMemberByName("nextThing");

        PropertyReferenceImpl refNextThing = new PropertyReferenceImpl("nextThing", new Location("test", 0));
        assertNotNull("Unable to find value def for 'nextThing'", vd);
        assertEquals("nextThing", model.getValue(refNextThing));

        vd = def.getMemberByName("firstThing");
        PropertyReferenceImpl refFirstThing = new PropertyReferenceImpl("firstThing", new Location("test", 1));
        assertNotNull("Unable to find value def for 'firstThing'", vd);
        assertEquals("firstThingDefault", model.getValue(refFirstThing));
    }

    /**
     * Verify that nice exception is thrown if model accessor is void
     */
    @Test
    public void testModelMethodSignatures() throws Exception {
        String[] failModels = new String[] { "java://org.auraframework.components.test.java.model.TestModelWithVoid",
        "java://org.auraframework.components.test.java.model.TestModelWithStatic" };
        String[] failMessages = new String[] { "@AuraEnabled annotation found on void method getNothing",
        "@AuraEnabled annotation found on invalid method getStaticString" };

        for (int i = 0; i < failModels.length; i++) {
            try {
                definitionService.getDefinition(failModels[i], ModelDef.class);
                fail("Expected InvalidDefinitionException on model " + failModels[i]);
            } catch (Exception e) {
                checkExceptionStart(e, InvalidDefinitionException.class, failMessages[i], failModels[i]);
            }
        }
    }

    /**
     * Verify that nice exception is thrown if model def doesn't exist
     */
    @Test
    public void testModelNotFound() throws Exception {
        DefDescriptor<ComponentDef> dd = addSourceAutoCleanup(ComponentDef.class,
                "<aura:component model='java://goats'/>");
        try {
            instanceService.getInstance(dd);
            fail("Expected DefinitionNotFoundException");
        } catch (DefinitionNotFoundException e) {
            assertTrue(e.getMessage().startsWith("No MODEL named java://goats found"));
        }
    }

    /**
     * Verify model can be accessed in system namespace
     */
    @Test
    public void testModelInSystemNamespace() throws Exception {
        String resourceSource = "<aura:component model='java://org.auraframework.components.test.java.model.TestModel'>Hello World!</aura:component>";

        DefDescriptor<? extends Definition> dd = getAuraTestingUtil().addSourceAutoCleanup(ComponentDef.class, resourceSource,
                StringSourceLoader.DEFAULT_NAMESPACE + ":testComponent", true);

        try {
            instanceService.getInstance(dd);
        } catch (NoAccessException e) {
            fail("Not Expected NoAccessException");
        }
    }

    /**
     * Verify model can not be accessed in custom namespace
     */
    @Test
    public void testModelInCustomNamespace() throws Exception {
        String resourceSource = "<aura:component model='java://org.auraframework.components.test.java.model.TestModel'>Hello World!</aura:component>";

        DefDescriptor<? extends Definition> dd = getAuraTestingUtil().addSourceAutoCleanup(ComponentDef.class, resourceSource,
                StringSourceLoader.DEFAULT_CUSTOM_NAMESPACE + ":testComponent", false);

        try {
            instanceService.getInstance(dd);
            fail("Expected NoAccessException");
        } catch (NoAccessException e) {
            String errorMessage = "Access to model 'org.auraframework.components.test.java.model:TestModel' from namespace '"+StringSourceLoader.DEFAULT_CUSTOM_NAMESPACE+"' in '"+dd.getQualifiedName()+"(COMPONENT)' disallowed by MasterDefRegistry.assertAccess()";
            assertEquals(errorMessage, e.getMessage());
        }
    }

    /**
     * Verify that accessing a non-existing property on model throws Exception.
     */
    @Test
    public void testNonExistingPropertiesOnModel() throws Exception {
        DefDescriptor<ModelDef> javaModelDefDesc = definitionService.getDefDescriptor(
                "java://org.auraframework.components.test.java.model.TestModel", ModelDef.class);
        ModelDef mDef = javaModelDefDesc.getDef();
        assertNotNull(mDef);
        Model model = mDef.newInstance();
        try {
            model.getValue(new PropertyReferenceImpl("fooBar", new Location("test", 0)));
            fail("Model should not be able to getValue of a non existing property.");
        } catch (Exception e) {
            checkExceptionStart(e, AuraExecutionException.class, "TestModel: no such property: fooBar",
                    javaModelDefDesc.getName());
        }
        try {
            model.getValue(new PropertyReferenceImpl("firstThi", new Location("test", 0)));
            fail("Model.getValue() on partial matches of property names should not be successful.");
        } catch (Exception e) {
            checkExceptionStart(e, AuraExecutionException.class, "TestModel: no such property: firstThi",
                    javaModelDefDesc.getName());
        }
    }

    private void checkInvalidModel(Class<?> clazz, String message) {
        DefDescriptor<ModelDef> desc = definitionService.getDefDescriptor("java://" + clazz.getName(), ModelDef.class);
        try {
            definitionService.getDefinition(desc);
            fail("Expected exception");
        } catch (Exception e) {
            checkExceptionStart(e, InvalidDefinitionException.class, message, clazz.getCanonicalName());
        }
    }

    @Annotations.Model
    public static class ModelPrivateConstructor {
        private ModelPrivateConstructor() {
        }
    };

    @Ignore
    @Test
    public void testPrivateConstructor() throws Exception {
        checkInvalidModel(ModelPrivateConstructor.class, "Default constructor is not public");
    }

    @Annotations.Model
    public static class ModelProtectedConstructor {
        protected ModelProtectedConstructor() {
        }
    };

    @Ignore
    @Test
    public void testProtectedConstructor() throws Exception {
        checkInvalidModel(ModelProtectedConstructor.class, "Default constructor is not public");
    }

    @Annotations.Model
    public static class ModelBadConstructor {
        public ModelBadConstructor(String value) {
        }
    };

    @Ignore
    @Test
    public void testBadConstructor() throws Exception {
        checkInvalidModel(ModelBadConstructor.class, "No default constructor found");
    }
}
