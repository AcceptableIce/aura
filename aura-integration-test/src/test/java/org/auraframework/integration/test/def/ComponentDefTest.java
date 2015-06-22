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
package org.auraframework.integration.test.def;

import java.util.HashSet;
import java.util.Set;

import org.auraframework.Aura;
import org.auraframework.def.ComponentDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.FlavoredStyleDef;
import org.auraframework.impl.css.util.Flavors;
import org.auraframework.impl.root.component.BaseComponentDefTest;
import org.auraframework.throwable.quickfix.FlavorNameNotFoundException;
import org.auraframework.throwable.quickfix.InvalidDefinitionException;

public class ComponentDefTest extends BaseComponentDefTest<ComponentDef> {

    public ComponentDefTest(String name) {
        super(name, ComponentDef.class, "aura:component");
    }

    /**
     * InvalidDefinitionException if we try to instantiate an abstract component with no providers.
     */
    public void testAbstractNoProvider() throws Exception {
        try {
            ComponentDef cd = define(baseTag, "abstract='true'", "");
            Aura.getInstanceService().getInstance(cd);
            fail("Should not be able to instantiate a component with no providers.");
        } catch (Exception e) {
            checkExceptionContains(e, InvalidDefinitionException.class, "cannot be instantiated directly");
        }
    }

    public void testAppendsStandardFlavorToDependencies() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format(baseTag, "", "<div aura:flavorable='true'></div>"));
        DefDescriptor<FlavoredStyleDef> flavor = addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc),
                ".THIS--test{}");

        Set<DefDescriptor<?>> dependencies = new HashSet<>();
        desc.getDef().appendDependencies(dependencies);
        assertTrue(dependencies.contains(flavor));
    }

    /**
     * Tests that confirm the specified default flavor exists
     */

    public void testErrorsWhenDefaultFlavorDoesntExist() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format(baseTag, "defaultFlavor='tesst'", "<div aura:flavorable='true'></div>"));
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc), ".THIS--test{}");

        try {
            desc.getDef().validateReferences();
            fail("expected to get an exception");
        } catch (Exception e) {
            checkExceptionContains(e, FlavorNameNotFoundException.class, "was not found");
        }
    }

    public void testNoErrorWhenDefaultFlavorExistsOnParent() throws Exception {
        DefDescriptor<ComponentDef> parent = addSourceAutoCleanup(ComponentDef.class,
                "<aura:component extensible='true'><div aura:flavorable='true'>{!v.body}</div></aura:component>");
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(parent), ".THIS--fromParent{}");

        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format("<aura:component extends='%s' defaultFlavor='fromParent'></aura:component>",
                        parent.getDescriptorName()));

        desc.getDef().validateReferences(); // no exception
    }

    public void testNoErrorWhenDefaultFlavorExistsOnDistantParent() throws Exception {
        // hierarchy two levels deep, up one level doesn't not have flavorable but above that does
        DefDescriptor<ComponentDef> distant = addSourceAutoCleanup(ComponentDef.class,
                "<aura:component extensible='true'><div aura:flavorable='true'>{!v.body}</div></aura:component>");
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(distant), ".THIS--fromParent{}");

        DefDescriptor<ComponentDef> parent = addSourceAutoCleanup(ComponentDef.class,
                String.format("<aura:component extends='%s' extensible='true'><div>{!v.body}</div></aura:component>",
                        distant.getDescriptorName()));

        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format("<aura:component extends='%s' defaultFlavor='fromParent'></aura:component>",
                        parent.getDescriptorName()));

        desc.getDef().validateReferences(); // no exception
    }

    public void testValidatesMultipleDefaultFlavorNamesBothValid() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                "<aura:component defaultFlavor='test, test2'><div aura:flavorable='true'></div></aura:component>");
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc), ".THIS--test{} .THIS--test2{}");
        desc.getDef().validateReferences(); // no exception
    }

    public void testValidatesMultipleDefaultFlavorNamesFromParent() throws Exception {
        DefDescriptor<ComponentDef> parent = addSourceAutoCleanup(ComponentDef.class,
                "<aura:component extensible='true'><div aura:flavorable='true'>{!v.body}</div></aura:component>");
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(parent), ".THIS--test{} .THIS--test2{}");

        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(
                getDefClass(),
                String.format("<aura:component extends='%s' defaultFlavor='test, test2'></aura:component>",
                        parent.getDescriptorName()));
        desc.getDef().validateReferences(); // no exception
    }

    public void testValidatesMultipleDefaultFlavorNamesOneInvalid() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                "<aura:component defaultFlavor='test, bad'><div aura:flavorable='true'></div></aura:component>");
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc), ".THIS--test{} .THIS--test2{}");

        try {
            desc.getDef().validateReferences(); // no exception
            fail("expected to get an exception");
        } catch (Exception e) {
            checkExceptionContains(e, FlavorNameNotFoundException.class, "was not found");
        }
    }

    /** when a default flavor is specified, validation should ensure there is a flavorable element */
    public void testValidatesComponentIsFlavorable() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format(baseTag, "defaultFlavor='test'", "<div></div>"));
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc), ".THIS--test{}");

        try {
            desc.getDef().validateReferences();
            fail("expected to get an exception");
        } catch (Exception e) {
            checkExceptionContains(e, InvalidDefinitionException.class, "The defaultFlavor attribute cannot");
        }
    }

    /** if extending from a component with a flavorable element, the validation should pass */
    public void testValidatesComponentIsFlavorableFromParent() throws Exception {
        DefDescriptor<ComponentDef> parent = addSourceAutoCleanup(ComponentDef.class,
                "<aura:component extensible='true'><div aura:flavorable='true'>{!v.body}</div></aura:component>");
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(parent), ".THIS--fromParent{}");

        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(
                getDefClass(),
                String.format("<aura:component extends='%s' defaultFlavor='fromParent'></aura:component>",
                        parent.getDescriptorName()));

        desc.getDef().validateReferences(); // no exception
    }

    public void testValidatesComponentIsFlavorableFromDistantParent() throws Exception {
        // hierarchy two levels deep, up one level doesn't not have flavorable but above that does
        DefDescriptor<ComponentDef> distant = addSourceAutoCleanup(ComponentDef.class,
                "<aura:component extensible='true'><div aura:flavorable='true'>{!v.body}</div></aura:component>");
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(distant), ".THIS--fromParent{}");

        DefDescriptor<ComponentDef> parent = addSourceAutoCleanup(
                ComponentDef.class,
                String.format("<aura:component extends='%s' extensible='true'><div>{!v.body}</div></aura:component>",
                        distant.getDescriptorName()));

        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format("<aura:component extends='%s' defaultFlavor='fromParent'></aura:component>",
                        parent.getDescriptorName()));

        desc.getDef().validateReferences(); // no exception
    }

    public void testValidatesComponentNotFlavorableFromAnyParent() throws Exception {
        DefDescriptor<ComponentDef> distant = addSourceAutoCleanup(ComponentDef.class,
                "<aura:component extensible='true'><div>{!v.body}</div></aura:component>");

        DefDescriptor<ComponentDef> parent = addSourceAutoCleanup(
                ComponentDef.class,
                String.format("<aura:component extends='%s' extensible='true'><div>{!v.body}</div></aura:component>",
                        distant.getDescriptorName()));

        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format("<aura:component extends='%s' defaultFlavor='fromParent'></aura:component>",
                        parent.getDescriptorName()));

        try {
            desc.getDef().validateReferences();
            fail("expected to get an exception");
        } catch (Exception e) {
            checkExceptionContains(e, InvalidDefinitionException.class, "The defaultFlavor attribute cannot");
        }
    }

    /**
     * The implicit default flavor is "default", but only when an explicit default isn't specified, the component has a
     * flavorable child (or is marked dynamicallyFlavorable), a flavor file exists, and the flavor file defines a flavor named "default".
     */

    public void testImplicitDefaultFlavor() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format(baseTag, "", "<div aura:flavorable='true'></div>"));
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc), ".THIS--default{}");
        assertEquals("default", desc.getDef().getDefaultFlavorOrImplicit());
    }

    public void testImplicitDefaultFlavorDynamicallyFlavored() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format(baseTag, "dynamicallyFlavorable='true'", "<div></div>"));
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc), ".THIS--default{}");
        assertEquals("default", desc.getDef().getDefaultFlavorOrImplicit());
    }

    public void testImplicitDefaultFlavorShorthand() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format(baseTag, "", "<div aura:flavorable='true'></div>"));
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc), ".THIS{}");
        assertEquals("default", desc.getDef().getDefaultFlavorOrImplicit());
    }

    public void testImplicitDefaultFlavorNoFlavoredStyleDef() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format(baseTag, "", "<div aura:flavorable='true'></div>"));
        assertNull(desc.getDef().getDefaultFlavorOrImplicit());
    }

    public void testImplicitDefaultFlavorDifferentName() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format(baseTag, "", "<div aura:flavorable='true'></div>"));
        // flavor name is "test", not "default"
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc), ".THIS--test{}");
        assertNull(desc.getDef().getDefaultFlavorOrImplicit());
    }

    public void testImplicitDefaultFlavorWithoutFlavorable() throws Exception {
        try {
            DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                    String.format(baseTag, "", "<div></div>"));
            addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc), ".THIS--default{}");
            desc.getDef().validateDefinition();
            // assertNull(desc.getDef().getDefaultFlavorOrImplicit());
            fail("expected to get an exception");
        } catch (Exception e) {
            checkExceptionContains(e, InvalidDefinitionException.class, "must contain at least one aura:flavorable");
        }
    }

    public void testExplicitAndImplicitDefaultFlavor() throws Exception {
        DefDescriptor<ComponentDef> desc = addSourceAutoCleanup(getDefClass(),
                String.format(baseTag, "defaultFlavor='test'", "<div aura:flavorable='true'></div>"));
        addSourceAutoCleanup(Flavors.standardFlavorDescriptor(desc),
                ".THIS--default{}" +
                        ".THIS--test{}");
        assertEquals("test", desc.getDef().getDefaultFlavorOrImplicit());
    }
}
