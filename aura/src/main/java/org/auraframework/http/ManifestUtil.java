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

import com.google.common.net.HttpHeaders;
import org.auraframework.adapter.ConfigAdapter;
import org.auraframework.def.ApplicationDef;
import org.auraframework.def.BaseComponentDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.DefDescriptor.DefType;
import org.auraframework.http.RequestParam.StringParam;
import org.auraframework.service.ContextService;
import org.auraframework.system.AuraContext;
import org.auraframework.system.AuraContext.Mode;
import org.auraframework.throwable.quickfix.QuickFixException;
import org.auraframework.util.AuraTextUtil;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.List;

/**
 * A set of manifest utilities.
 *
 * No state is kept in this utility class, and it cannot be instantiated.
 */
public class ManifestUtil {
    /**
     * An error parameter that causes a double fail.
     */
    private final static StringParam errorParam = new StringParam(AuraBaseServlet.AURA_PREFIX + "error", 128, false);

    /**
     * How many requests we accept before guessing that there is a loop.
     */
    private static final int MAX_MANIFEST_COUNT = 16;

    /**
     * The time allowed before we reset the count.
     */
    private static final int MAX_MANIFEST_TIME = 60 * 1000;
    public static final String MANIFEST_ERROR = "error";
    public static final String MANIFEST_COOKIE_TAIL = "_lm";

    /**
     * "Short" pages (such as manifest cookies and AuraFrameworkServlet pages)
     * expire in 1 day.
     */
    public static final long SHORT_EXPIRE_SECONDS = 24L * 60 * 60;
    public static final long SHORT_EXPIRE = SHORT_EXPIRE_SECONDS * 1000;

    /**
     * "Long" pages (such as resources and cached HTML templates) expire in 45
     * days. We also use this to "pre-expire" no-cache pages, setting their
     * expiration a month and a half into the past for user agents that don't
     * understand Cache-Control: no-cache.
     */
    public static final long LONG_EXPIRE = 45 * SHORT_EXPIRE;

    private final ContextService contextService;
    private final ConfigAdapter configAdapter;

    public ManifestUtil(ContextService contextService, ConfigAdapter configAdapter) {
        this.contextService = contextService;
        this.configAdapter = configAdapter;
    }

    /**
     * Check to see if we allow appcache on the current request.
     */
    public boolean isManifestEnabled(HttpServletRequest request) {
    	final String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        if (userAgent != null && !userAgent.toLowerCase().contains("applewebkit")) {
            return false;
        }

        return isManifestEnabled();
    }

    /**
     * Is AppCache allowed by the current configuration?
     */
    public boolean isManifestEnabled() {
        if (!configAdapter.isClientAppcacheEnabled()) {
            return false;
        }

        AuraContext context = contextService.getCurrentContext();
        DefDescriptor<? extends BaseComponentDef> desc = context.getApplicationDescriptor();

        if (desc != null && desc.getDefType().equals(DefType.APPLICATION)) {
            @SuppressWarnings("unchecked")
            DefDescriptor<ApplicationDef> appDefDesc = (DefDescriptor<ApplicationDef>)desc;
            try {
                Boolean useAppcache = context.getDefRegistry().getRawDef(appDefDesc).isAppcacheEnabled();
                if (useAppcache != null) {
                    return useAppcache.booleanValue();
                }
                return false;
            } catch (QuickFixException e) {
                return false;
            }
        }
        return false;
    }

    /**
     * Check a manifest cookie and update.
     *
     * This routine will check and update a manifest cookie value to ensure
     * that we are not looping. If the incoming cookie is null, it simply
     * initializes, othewise, it parses the cookie and returns null if it
     * requires a reset.
     *
     * @param incoming the cookie from the client.
     * @return either an updated cookie, or null if it was invalid.
     */
    public String updateManifestCookieValue(String incoming) {
        int manifestRequestCount = 0;
        long now = System.currentTimeMillis();
        long cookieTime = now;

        if (MANIFEST_ERROR.equals(incoming)) {
            return null;
        } else {
            List<String> parts = AuraTextUtil.splitSimple(":", incoming, 2);

            if (parts != null && parts.size() == 2) {
                String count = parts.get(0);
                String date = parts.get(1);
                try {
                    manifestRequestCount = Integer.parseInt(count);
                    cookieTime = Long.parseLong(date);
                    if (now - cookieTime > MAX_MANIFEST_TIME) {
                        //
                        // If we have gone off by more than 60 seconds,
                        // reset everything to start the counter.
                        //
                        manifestRequestCount = 0;
                        cookieTime = now;
                    }
                    if (manifestRequestCount >= MAX_MANIFEST_COUNT) {
                        // We have had 5 requests in 60 seconds. bolt.
                        return null;
                    }
                } catch (NumberFormatException e) {
                    //
                    // Bad cookie!
                    // This should actually be very hard to have happen,
                    // since it requires a cookie to have a ':' in it,
                    // and also to have unparseable numbers, so just punt
                    //
                    return null;
                }
            }
        }
        manifestRequestCount += 1;
        return manifestRequestCount + ":" + cookieTime;
    }

    /**
     * Get the expected name for the manifest cookie.
     *
     * @return the name (null if none)
     */
    private String getManifestCookieName() {
        AuraContext context = contextService.getCurrentContext();
        if (context.getApplicationDescriptor() != null) {
            StringBuilder sb = new StringBuilder();
            if (context.getMode() != Mode.PROD) {
                sb.append(context.getMode());
                sb.append("_");
            }
            sb.append(context.getApplicationDescriptor().getNamespace());
            sb.append("_");
            sb.append(context.getApplicationDescriptor().getName());
            sb.append(MANIFEST_COOKIE_TAIL);
            return sb.toString();
        }
        return null;
    }

    private void addCookie(HttpServletResponse response, String name, String value, long expiry) {
        if (name != null) {
            Cookie cookie = new Cookie(name, value);
            cookie.setPath("/");
            cookie.setMaxAge((int) expiry);
            response.addCookie(cookie);
        }
    }

    /**
     * Sets the manifest cookie on response.
     *
     * @param response the response
     * @param value the value to set.
     * @param expiry the expiry time for the cookie.
     */
    private void addManifestCookie(HttpServletResponse response, String value, long expiry) {
        String cookieName = getManifestCookieName();
        if (cookieName != null) {
            addCookie(response, cookieName, value, expiry);
        }
    }

    public Cookie getManifestCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            String cookieName = getManifestCookieName();
            if (cookieName != null) {
                for (int i = 0; i < cookies.length; i++) {
                    Cookie cookie = cookies[i];
                    if (cookieName.equals(cookie.getName())) {
                        return cookie;
                    }
                }
            }
        }
        return null;
    }

    public void addManifestErrorCookie(HttpServletResponse response) {
        addManifestCookie(response, MANIFEST_ERROR, SHORT_EXPIRE_SECONDS);
    }

    public void deleteManifestCookie(HttpServletResponse response) {
        addManifestCookie(response, "", 0);
    }

    /**
     * Check the manifest cookie.
     *
     * This routine checks the cookie and parameter on the request and sets the
     * response code appropriately if we should not send back a manifest.
     *
     * @param request the request (for the incoming cookie).
     * @param response the response (for the outgoing cookie and status)
     * @return false if the caller should bolt because we already set the status.
     */
    public boolean checkManifestCookie(HttpServletRequest request, HttpServletResponse response) {
        Cookie cookie = getManifestCookie(request);
        String cookieString = null;

        if (cookie != null) {
            cookieString = cookie.getValue();
        }
        cookieString = updateManifestCookieValue(cookieString);
        if (cookieString == null) {
            deleteManifestCookie(response);
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return false;
        }
        //
        // Now we look for the client telling us we need to break a cycle, in which case we set a cookie
        // and give the client no content.
        //
        if (errorParam.get(request) != null) {
            addManifestErrorCookie(response);
            response.setStatus(HttpServletResponse.SC_NO_CONTENT);
            return false;
        }

        addManifestCookie(response, cookieString, SHORT_EXPIRE_SECONDS);
        return true;
    }
}
