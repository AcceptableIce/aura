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
package org.auraframework.http;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.httpclient.HttpStatus;
import org.apache.commons.httpclient.methods.GetMethod;
import org.apache.commons.httpclient.methods.PostMethod;
import org.auraframework.components.security.SecurityProviderAccessLogger;
import org.auraframework.controller.java.ServletConfigController;
import org.auraframework.def.ApplicationDef;
import org.auraframework.def.BaseComponentDef;
import org.auraframework.def.ComponentDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.DefDescriptor.DefType;
import org.auraframework.system.AuraContext.Mode;
import org.auraframework.test.AuraHttpTestCase;
import org.auraframework.test.annotation.TestLabels;
import org.auraframework.test.annotation.ThreadHostileTest;
import org.auraframework.test.annotation.UnAdaptableTest;
import org.auraframework.util.AuraTextUtil;
import org.auraframework.util.json.Json;
import org.auraframework.util.json.JsonReader;

import com.google.common.collect.ImmutableSet;

/**
 * Automation to verify Security Providers functionally.
 *
 * @since 0.0.178
 */
@ThreadHostileTest
public class SecurityProviderHttpTest extends AuraHttpTestCase {
    public SecurityProviderHttpTest(String name) {
        super(name);
    }

    private GetMethod buildGetRequest(DefType defType, String attrs, String body, String contextStr) throws Exception {
        String tag = "aura:" + defType.name().toLowerCase();
        String source = String.format("<%s %s>%s</%1$s>", tag, attrs, body);
        DefDescriptor<?> desc = addSourceAutoCleanup(source, defType.getPrimaryInterface());
        String url = String.format("/string/%s.%s?aura.context=%s", desc.getName(),
                DefType.APPLICATION.equals(defType) ? "app" : "cmp", AuraTextUtil.urlencode(contextStr));
        return obtainGetMethod(url);
    }

    private void verifyGetAccessAllowed(DefType defType, String attrs, String contextStr) throws Exception {
        String myId = getName() + System.currentTimeMillis();
        GetMethod get = buildGetRequest(defType, attrs, myId, contextStr);
        int statusCode = getHttpClient().executeMethod(get);
        String response = get.getResponseBodyAsString();
        if (HttpStatus.SC_OK != statusCode) {
            fail(String.format("Unexpected status code <%s>, expected <%s>, response:%n%s", statusCode,
                    HttpStatus.SC_OK, response));
        }
        if (!response.contains(myId)) {
            fail(String.format("Response body is missing expected content: %s, actual: %s", myId, response));
        }
    }

    private void verifyGetAccessDenied(DefType defType, String attrs, String contextStr, String expectedReason)
            throws Exception {
        GetMethod get = buildGetRequest(defType, attrs, "", contextStr);
        int statusCode = getHttpClient().executeMethod(get);
        assertEquals("Unexpected http status code", HttpStatus.SC_NOT_FOUND, statusCode);
        String response = get.getResponseBodyAsString();
        if (response.startsWith("404 Not Found\n")) {
            // standalone aura case
            if ((expectedReason != null) && (!response.contains(expectedReason))) {
                fail(String.format("Response body does not contain expected reason.  Expected <%s> in:%n%s",
                        expectedReason, response));
            }
        } else if (!response.contains("URL No Longer Exists")) {
            // sfdc case
            fail("Unexpected response body: " + response);
        }
    }

    private void verifyGetError(DefType defType, String attrs, String contextStr, String expectedReason)
            throws Exception {
        GetMethod get = buildGetRequest(defType, attrs, "", contextStr);
        int statusCode = getHttpClient().executeMethod(get);
        if (HttpStatus.SC_NOT_FOUND != statusCode) {
            fail(String.format("Unexpected http status code.  Expected %s, but got %s, response:\n%s",
                    HttpStatus.SC_NOT_FOUND, statusCode, get.getResponseBodyAsString()));
        }
    }

    @Override
    public void tearDown() throws Exception {
        ServletConfigController.setProductionConfig(false);
        super.tearDown();
    }

    /**
     * Allow GET application in DEV mode, with default security provider.
     */
    @TestLabels("auraSanity")
    public void testGetDevApp() throws Exception {
        verifyGetAccessAllowed(DefType.APPLICATION, "", "{'mode':'DEV'}");
    }

    /**
     * Allow GET component in DEV mode, without app descriptor.
     */
    @TestLabels("auraSanity")
    public void testGetDevCmp() throws Exception {
        verifyGetAccessAllowed(DefType.COMPONENT, "", "{'mode':'DEV'}");
    }

    /**
     * Deny GET component in DEV mode, with app with security provider that denies access.
     */
    public void testGetDevCmpWithDenies() throws Exception {
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAlwaysDenies'>App Denies</aura:application>",
                ApplicationDef.class);
        verifyGetAccessDenied(DefType.COMPONENT, "",
                String.format("{'mode':'DEV','app':'%s'}", appDesc.getQualifiedName()),
                " disallowed by SecurityProviderAlwaysDenies");
    }

    /**
     * Deny GET application in DEV mode, with security provider that throws a Throwable.
     */
    public void testGetDevAppWithThrows() throws Exception {
        verifyGetAccessDenied(DefType.APPLICATION,
                "securityProvider='org.auraframework.components.security.SecurityProviderThrowsThrowable'",
                "{'mode':'DEV'}", "Access Denied: cause = generated intentionally");
    }

    /**
     * Deny GET component in DEV mode, with app with security provider that throws a Throwable.
     */
    public void testGetDevCmpWithThrows() throws Exception {
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderThrowsThrowable'>%s</aura:application>",
                ApplicationDef.class);
        verifyGetAccessDenied(DefType.COMPONENT, "",
                String.format("{'mode':'DEV','app':'%s'}", appDesc.getQualifiedName()),
                "Access Denied: cause = generated intentionally");
    }

    /**
     * Deny GET application in PROD mode, with default security provider.  No error info in response.
     */
    @TestLabels("auraSanity")
    public void testGetProdAppWithDefault() throws Exception {
        verifyGetAccessDenied(DefType.APPLICATION, "", "{'mode':'PROD'}", null);
    }

    /**
     * Deny GET application in PROD config, with security provider that throws a Throwable.
     */
    public void testGetProdConfigAppWithThrows() throws Exception {
        ServletConfigController.setProductionConfig(true);
        GetMethod get = buildGetRequest(DefType.APPLICATION,
                "securityProvider='org.auraframework.components.security.SecurityProviderThrowsThrowable'", "",
                "{'mode':'PROD'}");
        int statusCode = getHttpClient().executeMethod(get);

        assertEquals("Unexpected http status code", HttpStatus.SC_NOT_FOUND, statusCode);
        String response = get.getResponseBodyAsString();
        assertTrue("Unexpected response body",
                response.equals("404 Not Found\n") || response.contains("URL No Longer Exists"));
    }

    /**
     * Deny GET component in PROD mode, with app with security provider that throws a Throwable. No error info in
     * response.
     */
    public void testGetProdConfigCmpWithThrows() throws Exception {
        ServletConfigController.setProductionConfig(true);
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderThrowsThrowable'>%s</aura:application>",
                ApplicationDef.class);
        GetMethod get = buildGetRequest(DefType.COMPONENT, "", "",
                String.format("{'mode':'PROD','app':'%s'}", appDesc.getQualifiedName()));
        int statusCode = getHttpClient().executeMethod(get);
        assertEquals("Unexpected http status code", HttpStatus.SC_NOT_FOUND, statusCode);
        String response = get.getResponseBodyAsString();
        assertTrue("Unexpected response body",
                response.equals("404 Not Found\n") || response.contains("URL No Longer Exists"));
    }

    /**
     * Deny GET application in PROD config, with default security provider.
     */
    @UnAdaptableTest
    public void testGetProdConfigAppWithDefault() throws Exception {
        ServletConfigController.setProductionConfig(true);
        verifyGetAccessDenied(DefType.APPLICATION, "", "{'mode':'DEV'}", null);
    }

    /**
     * Deny GET component in PROD mode, without app descriptor.
     */
    @UnAdaptableTest
    public void testGetProdConfigCmpWithoutApp() throws Exception {
        ServletConfigController.setProductionConfig(true);
        verifyGetAccessDenied(DefType.COMPONENT, "", "", null);
    }

    /**
     * Allow GET application in PROD mode, with security provider that allows access.
     */
    @TestLabels("auraSanity")
    public void testGetProdAppWithAllows() throws Exception {
        verifyGetAccessAllowed(DefType.APPLICATION,
                "securityProvider='org.auraframework.components.security.SecurityProviderAlwaysAllows'",
                "{'mode':'PROD'}");
    }

    /**
     * Deny GET application in PROD mode, with security provider that denies access.
     */
    public void testGetProdAppWithDenies() throws Exception {
        verifyGetAccessDenied(DefType.APPLICATION,
                "securityProvider='org.auraframework.components.security.SecurityProviderAlwaysDenies'",
                "{'mode':'PROD'}", null);
    }

    /**
     * Deny GET application in PROD mode, with security provider that denies access, but trying other app.
     */
    public void testGetProdConfigAppWithDeniesAndOther() throws Exception {
        ServletConfigController.setProductionConfig(true);
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAlwaysAllows'>%s</aura:application>",
                ApplicationDef.class);
        verifyGetAccessDenied(DefType.APPLICATION,
                "securityProvider='org.auraframework.components.security.SecurityProviderAlwaysDenies'",
                String.format("{'app':'%s'}", appDesc.getQualifiedName()), null);
    }

    /**
     * Allow GET application in PROD mode, with security provider that allows access, but trying other app.
     */
    public void testGetProdConfigAppWithAllowsAndOther() throws Exception {
        ServletConfigController.setProductionConfig(true);
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAlwaysDenies'>%s</aura:application>",
                ApplicationDef.class);
        verifyGetAccessAllowed(DefType.APPLICATION,
                "securityProvider='org.auraframework.components.security.SecurityProviderAlwaysAllows'",
                String.format("{'app':'%s'}", appDesc.getQualifiedName()));
    }

    /**
     * Deny GET component in PROD mode, with app with default security provider.
     */
    @UnAdaptableTest
    public void testGetProdConfigCmpWithDefault() throws Exception {
        ServletConfigController.setProductionConfig(true);
        verifyGetAccessDenied(DefType.COMPONENT, "", "{'app':'aura:application'}", null);
    }

    /**
     * Allow GET component in PROD mode, with app with security provider that allows access.
     */
    @UnAdaptableTest
    // SFDCAuraServlet will not allow COMPONENTs at all
    public void testGetProdCmpWithAllows() throws Exception {
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAlwaysAllows'>%s</aura:application>",
                ApplicationDef.class);
        verifyGetAccessAllowed(DefType.COMPONENT, "",
                String.format("{'mode':'PROD','app':'%s'}", appDesc.getQualifiedName()));
    }

    /**
     * Deny GET component in PROD mode, with app with security provider that denies access.
     */
    public void testGetProdConfigCmpWithDenies() throws Exception {
        ServletConfigController.setProductionConfig(true);
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAlwaysDenies'>%s</aura:application>",
                ApplicationDef.class);
        verifyGetAccessDenied(DefType.COMPONENT, "", String.format("{'app':'%s'}", appDesc.getQualifiedName()), null);
    }

    /**
     * Deny GET component in PROD mode, with unknown app descriptor.
     */
    public void testGetProdConfigCmpWithUnknownApp() throws Exception {
        ServletConfigController.setProductionConfig(true);
        verifyGetError(DefType.COMPONENT, "", "{'app':'some:garbage'}", null);
    }

    /**
     * A given descriptor has its access checked only once during a request.
     */
    public void testCachingAccessChecks() throws Exception {
        // setup component, component containing previous, and app containing both
        DefDescriptor<ComponentDef> innerCmpDesc = addSourceAutoCleanup("<aura:component/>", ComponentDef.class);
        DefDescriptor<ComponentDef> outerCmpDesc = addSourceAutoCleanup(
                String.format("<aura:component><%1$s:%2$s/><%1$s:%2$s/>{!v.body}</aura:component>",
                        innerCmpDesc.getNamespace(), innerCmpDesc.getName()), ComponentDef.class);
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                String.format(
                        "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAccessLogger'><%1$s:%2$s><%3$s:%4$s/></%1$s:%2$s><%3$s:%4$s/></aura:application>",
                        outerCmpDesc.getNamespace(), outerCmpDesc.getName(), innerCmpDesc.getNamespace(),
                        innerCmpDesc.getName()), ApplicationDef.class);
        ImmutableSet<DefDescriptor<? extends BaseComponentDef>> expectedDescs = ImmutableSet.of(innerCmpDesc,
                outerCmpDesc, appDesc);

        // first request for app should have only 1 log for each desc
        SecurityProviderAccessLogger.clearLog();
        String url = String.format("/string/%s.%s?aura.context=%s", appDesc.getName(), "app",
                AuraTextUtil.urlencode("{'mode':'PROD'}"));
        assertEquals("Unexpected http status code", HttpStatus.SC_OK,
                getHttpClient().executeMethod(obtainGetMethod(url)));
        assertAccessLogContains(expectedDescs);

        // second request for app should also have only 1 log for each desc, not using prior request's cache
        SecurityProviderAccessLogger.clearLog();
        assertEquals("Unexpected http status code", HttpStatus.SC_OK,
                getHttpClient().executeMethod(obtainGetMethod(url)));
        assertAccessLogContains(expectedDescs);
    }

    private void assertAccessLogContains(ImmutableSet<DefDescriptor<? extends BaseComponentDef>> expectedDescs)
            throws Exception {
        List<DefDescriptor<?>> log = SecurityProviderAccessLogger.getLog();
        if (log.size() > 3) {
            fail("Security check should have been done only once per descriptor.  Instead, got: " + log);
        }

        if (!log.containsAll(expectedDescs)) {
            fail("Security check not executed for all expected descriptors: " + expectedDescs + ". Instead, got: "
                    + log);
        }

    }

    private PostMethod buildPostRequest(Mode mode, String actionDescriptor, String appDescriptor) throws Exception {
        Map<String, Object> message = new HashMap<String, Object>();
        Map<String, Object> actionInstance = new HashMap<String, Object>();
        actionInstance.put("descriptor", actionDescriptor);
        Map<?, ?>[] actions = { actionInstance };
        message.put("actions", actions);
        String jsonMessage = Json.serialize(message);

        Map<String, String> params = new HashMap<String, String>();
        params.put("message", jsonMessage);
        params.put("aura.lastmod", "" + getLastMod(mode));
        params.put("aura.token", getCsrfToken());
        params.put(
                "aura.context",
                String.format("{'mode':'%s'%s}", mode.name(),
                        appDescriptor == null ? "" : String.format(",'app':'%s'", appDescriptor)));
        return obtainPostMethod("/aura", params);
    }

    @SuppressWarnings("unchecked")
    private void verifyPostAccessAllowed(Mode mode, String actionDescriptor, String appDescriptor) throws Exception {
        PostMethod post = buildPostRequest(mode, actionDescriptor, appDescriptor);
        int statusCode = getHttpClient().executeMethod(post);
        assertEquals("Unexpected http status code", HttpStatus.SC_OK, statusCode);
        String response = post.getResponseBodyAsString();
        Map<String, Object> json = (Map<String, Object>)new JsonReader().read(response
                .substring(AuraBaseServlet.CSRF_PROTECT.length()));
        assertEquals("Unexpected state", "SUCCESS",
                ((Map<String, Object>)((List<Object>)json.get("actions")).get(0)).get("state"));
        Map<String, Object> context = (Map<String, Object>)json.get("context");
        assertEquals("Unexpected mode", mode.name(), context.get("mode"));
        if (appDescriptor != null) {
            assertEquals("Unexpected app", appDescriptor, context.get("app"));
        }
    }

    @SuppressWarnings("unchecked")
    private void verifyPostAccessDenied(Mode mode, String actionDescriptor, String appDescriptor) throws Exception {
        PostMethod post = buildPostRequest(mode, actionDescriptor, appDescriptor);
        int statusCode = getHttpClient().executeMethod(post);
        assertEquals("Unexpected http status code", HttpStatus.SC_OK, statusCode);
        String response = post.getResponseBodyAsString();
        assertTrue("Expected error string", response.endsWith("/*ERROR*/"));
        Map<String, Object> json = (Map<String, Object>)new JsonReader().read("/*"+response);
        String desc = ((Map<String, Object>)json.get("event")).get("descriptor").toString();
        assertEquals("Unexpected event", "markup://aura:noAccess", desc);
    }

    /**
     * Allow POST action in DEV mode, without app descriptor.
     */
    @TestLabels("auraSanity")
    public void testPostDevActionWithoutApp() throws Exception {
        verifyPostAccessAllowed(Mode.DEV, "java://test.controller.JavaController/ACTION$noArgs", null);
    }

    /**
     * Deny POST action in DEV mode, with app with security provider that denies access.
     */
    public void testPostDevActionWithAppDenied() throws Exception {
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAlwaysDenies'>%s</aura:application>",
                ApplicationDef.class);
        verifyPostAccessDenied(Mode.DEV, "java://test.controller.JavaController/ACTION$noArgs", appDesc.getNamespace()
                + ":" + appDesc.getName());
    }

    /**
     * Allow POST action in DEV mode, with app with security provider that allows access.
     */
    public void testPostDevActionWithAppAllowed() throws Exception {
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAlwaysAllows'>%s</aura:application>",
                ApplicationDef.class);
        verifyPostAccessAllowed(Mode.DEV, "java://test.controller.JavaController/ACTION$noArgs",
                                appDesc.getNamespace() + ":" + appDesc.getName());
    }

    /**
     * Deny POST action in PROD mode, without app descriptor.
     */
    public void testPostProdActionWithoutApp() throws Exception {
        verifyPostAccessDenied(Mode.PROD, "java://test.controller.JavaController/ACTION$noArgs", null);
    }

    /**
     * Deny POST action in PROD mode, with app with security provider that denies access.
     */
    public void testPostProdActionWithAppDenied() throws Exception {
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAlwaysDenies'>%s</aura:application>",
                ApplicationDef.class);
        verifyPostAccessDenied(Mode.PROD, "java://test.controller.JavaController/ACTION$noArgs", appDesc.getNamespace()
                + ":" + appDesc.getName());
    }

    /**
     * Allow POST action in PROD mode, with app with security provider that allows access.
     */
    @TestLabels("auraSanity")
    public void testPostProdActionWithAppAllowed() throws Exception {
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAlwaysAllows'>%s</aura:application>",
                ApplicationDef.class);
        verifyPostAccessAllowed(Mode.PROD, "java://test.controller.JavaController/ACTION$noArgs",
                                appDesc.getNamespace() + ":" + appDesc.getName());
    }

    /**
     * Allow POST action in PROD mode, with unsecured namespace prefix.
     */
    public void _testPostProdActionWithUnsecuredNamespace() throws Exception {
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderAlwaysDenies'>%s</aura:application>",
                ApplicationDef.class);
        verifyPostAccessAllowed(Mode.PROD,
                "java://org.auraframework.impl.java.controller.TestController/ACTION$doSomething",
                                appDesc.getNamespace() + ":" + appDesc.getName());
    }

    /**
     * Deny POST action in PROD mode, with app with security provider that throws a Throwable.
     */
    @SuppressWarnings("unchecked")
    public void testPostProdConfigActionWithAppThrows() throws Exception {
        ServletConfigController.setProductionConfig(true);
        DefDescriptor<ApplicationDef> appDesc = addSourceAutoCleanup(
                "<aura:application securityProvider='org.auraframework.components.security.SecurityProviderThrowsThrowable'>%s</aura:application>",
                ApplicationDef.class);
        PostMethod post = buildPostRequest(Mode.PROD, "java://test.controller.JavaController/ACTION$noArgs",
                appDesc.getNamespace() + ":" + appDesc.getName());
        int statusCode = getHttpClient().executeMethod(post);
        assertEquals("Unexpected http status code", HttpStatus.SC_OK, statusCode);
        String response = post.getResponseBodyAsString();
        assertTrue("Expected error string", response.endsWith("/*ERROR*/"));
        Map<String, Object> json = (Map<String, Object>)new JsonReader().read("/*"+response);
        String desc = ((Map<String, Object>)json.get("event")).get("descriptor").toString();
        assertEquals("Unexpected event", "markup://aura:noAccess", desc);
    }

    /**
     * Deny POST action in PROD mode, with unknown app descriptor.
     */
    public void testPostProdConfigActionWithUnknownApp() throws Exception {
        ServletConfigController.setProductionConfig(true);
        verifyPostAccessDenied(Mode.PROD, "java://test.controller.JavaController/ACTION$noArgs", "some:garbage");
    }
}
