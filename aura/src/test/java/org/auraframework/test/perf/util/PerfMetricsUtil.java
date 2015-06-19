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

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

import org.auraframework.test.util.AuraUITestingUtil;
import org.auraframework.util.AuraFiles;
import org.auraframework.util.test.perf.metrics.PerfMetric;
import org.auraframework.util.test.perf.metrics.PerfMetrics;
import org.auraframework.util.test.perf.rdp.RDPAnalyzer;
import org.auraframework.util.test.perf.rdp.RDPNotification;
import org.auraframework.util.test.perf.rdp.TraceEventStats;
import org.auraframework.util.test.perf.rdp.TraceEventUtil;
import org.json.JSONException;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;

public class PerfMetricsUtil {
	private static final Logger logger = Logger.getLogger(PerfMetricsUtil.class.getSimpleName());
    private final PerfExecutorTest test;
    private RDPAnalyzer rdpAnalyzer;
    private List<RDPNotification> notifications;
    private String metricsMode; 
    private AuraUITestingUtil auraUITestingUtil; 
    private Map<String, Map<String, Map<String, Long>>> auraStats;
    
    public PerfMetricsUtil(PerfExecutorTest test, String metricsMode) {
        this.test = test;
        this.metricsMode = metricsMode;
        auraUITestingUtil = new AuraUITestingUtil(test.getWebDriver());
    }

    /**
     * Evaluate the collected perf metrics
     * //TODO Handle diff for a subset of metrics
     * @throws Exception 
     */
    public void evaluateResults() throws Exception{
    	// Get the median metrics after all the runs.
    	PerfMetrics metrics = test.getPerfRunsCollector().getMedianMetrics();
    	
    	// Write the results into file
    	String resultsFileName = writeResults(metrics);
    	
    	// Diff the results file against an existing goldfile per component
    	test.setExplicitGoldResultsFolder(resolveGoldFilePath(resultsFileName));
    	PerfResultsUtil.assertPerfDiff(test, "goldfile.json", metrics);
    }

    
    /**
     * Write the results into json files and db
     * @param metrics
     * @return
     * @throws JSONException 
     */
    private String writeResults(PerfMetrics metrics) throws JSONException{
    	// Write the metrics into result file
    	String resultsFileName = test.getComponentDef().getName();
    	PerfResultsUtil.writeGoldFile(metrics, resultsFileName);
    	
    	logger.info("Writing results for component: " + resultsFileName + " into db");
    	// Write the results to Db
    	PerfResultsUtil.writeToDb(metrics, resultsFileName);
    	
    	// Write the timeline events
    	PerfResultsUtil.writeDevToolsLog(test.getPerfRunsCollector().getMedianRun().getDevToolsLog(), resultsFileName);
    	return resultsFileName;

    }
    
    private String resolveGoldFilePath(String resultsFileName){
    	String path =  AuraFiles.Core.getPath() + "/aura-components/src/test/components/";
    	String componentPath = test.getComponentDef().getNamespace() + "/" + resultsFileName;
    	String fullPath = path + componentPath;
		Path resourcesSourceDir = Paths.get(fullPath);
		return resourcesSourceDir.toString();
    }
    
    private void prepareNetworkMetrics(PerfMetrics metrics){
    	for (PerfMetric metric : rdpAnalyzer.analyzeNetworkDomain()) {
            metrics.setMetric(metric);
        }
    }
    
    private void prepareTimelineMetrics(PerfMetrics metrics){
    	Map<String, TraceEventStats> traceEventsStats = rdpAnalyzer.analyzeTraceDomain();
    	for (TraceEventStats stats : traceEventsStats.values()) {
            PerfMetric metric = new PerfMetric();
            String statName = stats.getName();
            Object statValue = stats.getValue();
            
            // TODO Better way to handle this is to abstract this in TraceEventStats
            if(statName.equals("UpdateCounters")) {
            	Map<String, Object> memoryCounters = (Map<String, Object>) statValue;
            	 for(Map.Entry<String, Object> entry: memoryCounters.entrySet()){
            		 metric.setName(TraceEventUtil.toMetricName(entry.getKey()));
            		 metric.setValue(entry.getValue());
            		 metrics.setMetric(metric);
            		 metric = new PerfMetric();
            	 }
            }
            else {
	            metric.setName(TraceEventUtil.toMetricName(statName));
	            metric.setValue(statValue);
	            metrics.setMetric(metric);
            }
    	}
    	// keep the corresponding Dev Tools Log for the metrics
        metrics.setDevToolsLog(rdpAnalyzer.getDevToolsLog());
    }
    
    private void handleCoqlMetrics(PerfMetrics metrics, String name){
    	Map<String, Map<String, Long>> nameValue = auraStats.get(name);
        for (String method : nameValue.keySet()) {
            Map<String, Long> methodValue = nameValue.get(method);
            for (String what : methodValue.keySet()) {
                Long value = methodValue.get(what);
                metrics.setMetric("Aura." + name + '.' + method + '.' + what, value);
            }
        }
    }
    
    private void prepareAuraMetrics(PerfMetrics metrics){
    	if (auraStats != null) {   		
            for (String name : auraStats.keySet()) {
            	//TODO Handle resultsets other than coql
            	if(!name.equals("coql")) break;
                handleCoqlMetrics(metrics, name);
            }
        }
    }
    
    private void prepareAllMetrics(PerfMetrics metrics){
    	rdpAnalyzer = new RDPAnalyzer(notifications, test.getPerfStartMarker(), test.getPerfEndMarker());
        prepareNetworkMetrics(metrics);
        prepareTimelineMetrics(metrics);
        prepareAuraMetrics(metrics);
    }
    
    public PerfMetrics prepareResults() {
    	PerfMetrics metrics = new PerfMetrics();
    	prepareAllMetrics(metrics);
        return metrics;
    }
    
    public void startCollecting() {
    	// Start recording
    	test.getRDPNotifications();
    }
    
    public void stopCollecting() {
    	WebDriver driver = test.getWebDriver();   	
    	notifications = test.getRDPNotifications();
    	//TODO auraUITestingUtil unable to execute the js correctly
		Object obj = ((JavascriptExecutor) driver).executeScript("return $A.PerfRunner.results");
		auraStats = (Map<String, Map<String, Map<String, Long>>>) obj;   
    }
}
