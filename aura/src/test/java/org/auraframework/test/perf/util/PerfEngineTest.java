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
package org.auraframework.test.perf.util;

import java.lang.reflect.Constructor;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Vector;
import java.util.logging.Level;
import java.util.logging.Logger;

import junit.framework.Test;
import junit.framework.TestSuite;

import org.auraframework.def.ComponentDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.util.ServiceLocator;
import org.auraframework.util.test.annotation.PerfTestSuite;
import org.auraframework.util.test.annotation.UnAdaptableTest;
import org.auraframework.util.test.perf.metrics.PerfMetricsComparator;
import org.auraframework.util.test.util.TestInventory;
import org.auraframework.util.test.util.TestInventory.Type;

@UnAdaptableTest
@PerfTestSuite
public class PerfEngineTest extends TestSuite implements PerfTestFramework {

    private PerfConfigUtil perfConfigUtil;

    private static final Logger LOG = Logger.getLogger(PerfEngineTest.class.getSimpleName());

    public static TestSuite suite() throws Exception {
        return new PerfEngineTest();
    }

    public PerfEngineTest() throws Exception {
        this("Component Perf tests");
    }

    public PerfEngineTest(String name) throws Exception {
        LOG.info("ComponentPerfTestEngine: " + name);
        setName(name);
        init();
    }

    private void init() throws Exception {
        perfConfigUtil = new PerfConfigUtil();
        Map<DefDescriptor<ComponentDef>, PerfConfig> tests = discoverTests();
        runTests(tests);
    }

    @Override
    public void runTests(Map<DefDescriptor<ComponentDef>, PerfConfig> tests) throws Exception {
        // Map component def to component config options.
        for (Map.Entry<DefDescriptor<ComponentDef>, PerfConfig> entry : tests.entrySet()) {
            addTest(new ComponentSuiteTest(entry.getKey(), entry.getValue()));
        }

    }

    @Override
    public Map<DefDescriptor<ComponentDef>, PerfConfig> discoverTests() {
        return perfConfigUtil.getComponentTestsToRun();
    }

    public List<DefDescriptor<ComponentDef>> getComponentDefs(Map<DefDescriptor<ComponentDef>, PerfConfig> configMap) {
        List<DefDescriptor<ComponentDef>> defs = new ArrayList<>();
        for (DefDescriptor<ComponentDef> def : configMap.keySet())
            defs.add(def);
        return defs;
    }

    private class ComponentSuiteTest extends TestSuite {
        ComponentSuiteTest(DefDescriptor<ComponentDef> descriptor, final PerfConfig config) {
            super(descriptor.getName());
            TestInventory inventory = ServiceLocator.get().get(TestInventory.class, "auraTestInventory");
            Vector<Class<? extends Test>> testClasses = inventory.getTestClasses(Type.PERFCMP);

            for (Class<? extends Test> testClass : testClasses) {
                try {
                    Constructor<? extends Test> constructor = testClass.getConstructor(DefDescriptor.class,
                            PerfConfig.class);
                    PerfExecutorTest test = (PerfExecutorTest) constructor.newInstance(descriptor, config);
                    test.setPerfMetricsComparator(new PerfMetricsComparator() {
                        @Override
                        protected int getAllowedVariability(String metricName) {
                            if (config.getVariability(metricName) != null) {
                                return config.getVariability(metricName);
                            }
                            // Use default variability, if variability is not set in config
                            return super.getAllowedVariability(metricName);
                        }
                    });
                    // addTest(patchPerfComponentTestCase(test, descriptor));
                    addTest(test);
                } catch (Exception e) {
                    LOG.log(Level.WARNING, "exception instantiating " + testClass.getName(), e);
                }
            }
        }
    }

}
