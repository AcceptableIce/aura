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

import com.google.common.collect.ImmutableList;
import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;
import org.auraframework.def.BaseComponentDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.service.ContextService;
import org.auraframework.system.AuraContext.Authentication;
import org.auraframework.system.AuraContext.Format;
import org.auraframework.system.AuraContext.Mode;
import org.auraframework.util.AuraFiles;
import org.auraframework.util.ServiceLocator;
import org.auraframework.util.test.annotation.PerfTestSuite;
import org.auraframework.util.test.annotation.UnAdaptableTest;
import org.auraframework.util.test.perf.metrics.PerfMetricsComparator;
import org.auraframework.util.test.util.TestInventory;
import org.auraframework.util.test.util.TestInventory.Type;

import javax.inject.Inject;
import java.lang.reflect.Constructor;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Vector;
import java.util.logging.Level;
import java.util.logging.Logger;

@UnAdaptableTest
@PerfTestSuite
public class PerfEngineTestSuite extends TestSuite implements PerfTestFramework {

    private PerfConfigUtil perfConfigUtil;
    private static String DB_INSTANCE = System.getProperty("dbURI");
    private static final Logger LOG = Logger.getLogger(PerfEngineTestSuite.class.getSimpleName());

    @Inject
    private ContextService contextService;

    public static TestSuite suite() throws Exception {
        return new PerfEngineTestSuite();
    }

    public PerfEngineTestSuite() throws Exception {
        this("Component Perf tests");
    }

    public PerfEngineTestSuite(String name) throws Exception {
        LOG.info("ComponentPerfTestEngine: " + name);
        setName(name);
        init();
    }

    private void init() throws Exception {
        perfConfigUtil = new PerfConfigUtil();
        Map<DefDescriptor<BaseComponentDef>, PerfConfig> tests = discoverTests();
        runTests(tests);
    }

    @Override
    public void runTests(Map<DefDescriptor<BaseComponentDef>, PerfConfig> tests) throws Exception {
        // Map component def to component config options.
        for (Map.Entry<DefDescriptor<BaseComponentDef>, PerfConfig> entry : tests.entrySet()) {
            addTest(new ComponentTestSuite(entry.getKey(), entry.getValue()));
        }
    }

    @Override
    public Map<DefDescriptor<BaseComponentDef>, PerfConfig> discoverTests() {
        return perfConfigUtil.getComponentTestsToRun(getNamespaces());
    }
    
    public List<DefDescriptor<BaseComponentDef>> getComponentDefs(Map<DefDescriptor<BaseComponentDef>, PerfConfig> configMap) {
        List<DefDescriptor<BaseComponentDef>> defs = new ArrayList<>();
        for (DefDescriptor<BaseComponentDef> def : configMap.keySet())
            defs.add(def);
        return defs;
    }

    private ContextService establishAuraContext() {
        if (!contextService.isEstablished()) {
            contextService.startContext(Mode.PTEST, Format.JSON, Authentication.AUTHENTICATED);
        }
        return contextService;
    }

    private class ComponentTestSuite extends TestSuite {
        ComponentTestSuite(DefDescriptor<BaseComponentDef> defDescriptor, final PerfConfig config) {
            super(defDescriptor.getName());
            ContextService contextService = establishAuraContext();
            TestInventory inventory = ServiceLocator.get().get(TestInventory.class, "auraTestInventory");
            Vector<Class<? extends Test>> testClasses = inventory.getTestClasses(Type.PERFCMP);

            for (Class<? extends Test> testClass : testClasses) {
                try {
                    Constructor<? extends Test> constructor = testClass.getConstructor(DefDescriptor.class,
                            PerfConfig.class, String.class);
                    PerfExecutorTest test = (PerfExecutorTest) constructor.newInstance(defDescriptor, config, DB_INSTANCE);
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
                    addTest(patchPerfComponentTestCase(test, defDescriptor));
                } catch (Exception e) {
                    LOG.log(Level.WARNING, "exception instantiating " + testClass.getName(), e);
                } finally {
                    if (contextService.isEstablished()) {
                        contextService.endContext();
                    }
                }
            }
        }
    }

    /**
     * @return the list of namespaces to create tests for
     */
    public List<String> getNamespaces() {
        return ImmutableList.of("PerformanceTest");
    }
    
    private String resolveGoldFilePath(PerfExecutorTest test) {
        String path = AuraFiles.Core.getPath() + "/aura-components/src/test/components/";
        String componentPath = test.getComponentDef().getNamespace() + "/" + test.getComponentDef().getName();
        String fullPath = path + componentPath;
        return fullPath;
    }
    
    /**
     * Sfdc specific tweaks can be made here to tests running in core.
     * @param test
     * @param descriptor
     * @return return test
     * @throws Exception
     */
	protected TestCase patchPerfComponentTestCase(PerfExecutorTest test,
			DefDescriptor<BaseComponentDef> descriptor) throws Exception {
		test.setExplicitGoldResultsFolder(resolveGoldFilePath(test));
		return test;
	}

}
