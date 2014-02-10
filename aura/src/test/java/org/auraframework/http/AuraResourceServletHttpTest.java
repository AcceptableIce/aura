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
package org.auraframework.http;

import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Calendar;

import org.apache.http.Header;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.message.BasicHeader;
import org.auraframework.def.ComponentDef;
import org.auraframework.system.AuraContext.Format;
import org.auraframework.system.AuraContext.Mode;
import org.auraframework.test.AuraHttpTestCase;
import org.auraframework.test.annotation.TestLabels;
import org.auraframework.test.annotation.UnAdaptableTest;
import org.auraframework.util.AuraTextUtil;
import org.junit.Ignore;

/**
 * Automation to verify the functioning of AuraResourceServlet. AuraResourceServlet is used to preload definitions of
 * components in a given namespace. It is also used to load CSS
 * 
 * 
 * 
 * @since 0.0.128
 */
public class AuraResourceServletHttpTest extends AuraHttpTestCase {
    public AuraResourceServletHttpTest(String name) {
        super(name);
    }

    @Ignore("W-2034311")
    @TestLabels("auraSanity")
    public void testCSSOrdering() throws Exception {
        String modeAndContext = getContext(Mode.DEV, Format.CSS, "auratest:test_css_a", ComponentDef.class, false);
        String url = "/l/" + AuraTextUtil.urlencode(modeAndContext) + "/app.css";
        HttpGet get = obtainGetMethod(url);
        HttpResponse httpResponse = perform(get);
        int statusCode = getStatusCode(httpResponse);
        String response = getResponseBody(httpResponse);
        get.releaseConnection();

        assertEquals(HttpStatus.SC_OK, statusCode);

        int idx_a, idx_b, idx_c, idx_d;

        idx_a = response.indexOf("div.auratestTest_css_a");
        idx_b = response.indexOf("div.auratestTest_css_b");
        idx_c = response.indexOf("div.auratestTest_css_c");
        idx_d = response.indexOf("div.auratestTest_css_d");
        assertTrue("_d must come before _c", idx_d < idx_c);
        assertTrue("_c must come before _b", idx_c < idx_b);
        assertTrue("_b must come before _a", idx_b < idx_a);
    }

    /**
     * Verify that special characters in CSS file are serialized down to the client. To make sure they are not replaced
     * with a '?' Automation for W-1071128
     * 
     * @throws Exception
     */
    @UnAdaptableTest
    public void testSpecialCharactersInCSSAreSerialized() throws Exception {
        String modeAndContext = getSimpleContext(Format.CSS, false);
        String url = "/l/" + AuraTextUtil.urlencode(modeAndContext) + "/app.css";

        HttpGet get = obtainGetMethod(url);
        HttpResponse httpResponse = perform(get);
        int statusCode = getStatusCode(httpResponse);
        String response = getResponseBody(httpResponse);
        get.releaseConnection();

        assertEquals(HttpStatus.SC_OK, statusCode);

        String expected = Arrays.toString("•".getBytes());
        String token = "content:'";
        int start = response.indexOf(token) + token.length();
        String actual = Arrays.toString(response.substring(start, response.indexOf('\'', start)).getBytes());
        assertEquals(String.format("Failed to see the special character in the CSS file (%s)", url), expected, actual);
    }

    /**
     * Verify that special characters in component mark up are serialized as part of component definition. Automation
     * for W-1071128
     * 
     * @throws Exception
     */
    @UnAdaptableTest
    public void testSpecialCharactersInMarkupAreSerialized() throws Exception {
        String modeAndContext = getSimpleContext(Format.JS, false);
        String url = "/l/" + AuraTextUtil.urlencode(modeAndContext) + "/app.js";

        HttpGet get = obtainGetMethod(url);
        HttpResponse httpResponse = perform(get);
        int statusCode = getStatusCode(httpResponse);
        String response = getResponseBody(httpResponse);
        get.releaseConnection();

        assertEquals(HttpStatus.SC_OK, statusCode);

        String expected = Arrays.toString("공유".getBytes("UTF8"));
        String token = "Test whether the special character shows up: ";
        int start = response.indexOf(token) + token.length();
        String actual = Arrays.toString(response.substring(start, response.indexOf(" ", start)).getBytes("UTF8"));
        assertEquals(String.format("Failed to see the special character in the Component definition (%s)", url),
                expected, actual);
    }

    /**
     * GET with If-Modified-Since header from an hour ago, will return 304 if the UID is correct.
     */
    @TestLabels("auraSanity")
    public void testGetWithIfModifiedSinceOld() throws Exception {
        String requestContext = getSimpleContext(Format.JS, false);
        String url = "/l/" + AuraTextUtil.urlencode(requestContext) + "/app.js";

        Calendar stamp = Calendar.getInstance();
        stamp.add(Calendar.HOUR, -1);

        Header[] headers = new Header[] { new BasicHeader(HttpHeaders.IF_MODIFIED_SINCE,
                new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz").format(stamp.getTime())) };

        HttpGet get = obtainGetMethod(url, headers);
        HttpResponse httpResponse = perform(get);
        int statusCode = getStatusCode(httpResponse);
        String response = getResponseBody(httpResponse);
        get.releaseConnection();

        assertEquals(HttpStatus.SC_NOT_MODIFIED, statusCode);
        assertNull(response);
    }

    /**
     * GET with If-Modified-Since header from an hour ago, will return 304 if the UID is correct.
     */
    @TestLabels("auraSanity")
    public void testGetWithIfModifiedSinceOldModified() throws Exception {
        String requestContext = getSimpleContext(Format.JS, true);
        String url = "/l/" + AuraTextUtil.urlencode(requestContext) + "/app.js";

        Calendar stamp = Calendar.getInstance();
        stamp.add(Calendar.HOUR, -1);

        Header[] headers = new Header[] { new BasicHeader(HttpHeaders.IF_MODIFIED_SINCE,
                new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz").format(stamp.getTime())) };

        HttpGet get = obtainGetMethod(url, headers);
        HttpResponse httpResponse = perform(get);
        int statusCode = getStatusCode(httpResponse);
        String response = getResponseBody(httpResponse);
        get.releaseConnection();

        assertEquals(HttpStatus.SC_OK, statusCode);
        assertNotNull(response);
    }

    /**
     * GET with If-Modified-Since header 45 days from now, will return 304 with empty body.
     */
    @TestLabels("auraSanity")
    public void testGetWithIfModifiedSinceNew() throws Exception {
        String url = "/l/" + AuraTextUtil.urlencode(getSimpleContext(Format.JS, false)) + "/app.js";
        Calendar stamp = Calendar.getInstance();
        stamp.add(Calendar.DAY_OF_YEAR, 45);

        Header[] headers = new Header[] { new BasicHeader(HttpHeaders.IF_MODIFIED_SINCE,
                new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zzz").format(stamp.getTime())) };

        HttpGet get = obtainGetMethod(url, headers);
        HttpResponse httpResponse = perform(get);
        int statusCode = getStatusCode(httpResponse);
        String response = getResponseBody(httpResponse);
        get.releaseConnection();

        assertEquals(HttpStatus.SC_NOT_MODIFIED, statusCode);
        assertNull(response);
    }

    /**
     * GET without If-Modified-Since header from an hour ago, will return the expected resource.
     */
    @TestLabels("auraSanity")
    public void testGetWithoutIfModifiedSince() throws Exception {
        String requestContext = getSimpleContext(Format.JS, false);
        String url = "/l/" + AuraTextUtil.urlencode(requestContext) + "/app.js";

        HttpGet get = obtainGetMethod(url);
        HttpResponse httpResponse = perform(get);
        int statusCode = getStatusCode(httpResponse);
        String response = getResponseBody(httpResponse);
        get.releaseConnection();

        assertEquals(HttpStatus.SC_OK, statusCode);
        assertNotNull(response);
    }
}
