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
package org.auraframework.throwable;

import org.auraframework.system.AuraContext.Mode;
import org.auraframework.test.WebDriverTestCase;
import org.openqa.selenium.By;

/**
 * Automation for error message displayed in auraErrorMask div.
 */
public class ErrorMessageGITUITest extends WebDriverTestCase {
    private final By ERROR_MASK_LOCATOR = By.cssSelector("div[id='auraErrorMask']");
    private final By ERROR_CLOSE_LOCATOR = By.cssSelector("a[class~='close']");
    private final By ERROR_MSG_LOCATOR = By.cssSelector("div[id='auraErrorMessage']");

    public ErrorMessageGITUITest(String name) {
        super(name);
    }

    /**
     * Verify that error message box displays in the auraErrorMask div and can be dismissed using the close button.
     * Automation for W-1091838.
     */
    public void testErrorMessageDisplayAndClose() throws Exception {
        open("/test/laxSecurity.app", Mode.PROD);
        waitForElement("Error mask should not be visible when there is not error.", findDomElement(ERROR_MASK_LOCATOR),
                false);

        // Cause an error to show up on client
        String errorMsg = "Something went haywire!";
        auraUITestingUtil.getEval("$A.error('" + errorMsg + "')");

        waitForElement("Error mask should be visible when there is an error.", findDomElement(ERROR_MASK_LOCATOR), true);
        assertEquals("Did not find expected error in error message element.", errorMsg, getText(ERROR_MSG_LOCATOR));

        findDomElement(ERROR_CLOSE_LOCATOR).click();
        waitForElement("Error mask should not be visible after the close operation.",
                findDomElement(ERROR_MASK_LOCATOR), false);
    }

    public void testFriendlyErrorFiresSystemError() throws Exception {
        open("/clientApiTest/auraError.app");
        findDomElement(By.cssSelector(".friendlyErrorButton")).click();
        waitForCondition("return $A.getRoot().get('v.systemErrorHandled')");
    }

    public void testFriendlyErrorDisplaysErrorIfNotHandled_DevMode() throws Exception {
        open("/clientApiTest/auraError.app?setFriendlyErrorHandled=false", Mode.DEV);
        findDomElement(By.cssSelector(".friendlyErrorButton")).click();
        assertDisplayedErrorMessage("Friendly Error Test");
        assertStacktracePresent();
    }

    public void testFriendlyErrorDisplaysErrorIfNotHandled_ProdMode() throws Exception {
        open("/clientApiTest/auraError.app?setFriendlyErrorHandled=false", Mode.PROD);
        findDomElement(By.cssSelector(".friendlyErrorButton")).click();
        assertDisplayedErrorMessage("Friendly Error Test");
        assertNoStacktracePresent();
    }

    public void testAuraError_DevMode() throws Exception {
        open("/clientApiTest/auraError.app", Mode.DEV);
        findDomElement(By.cssSelector(".auraErrorButton")).click();
        assertDisplayedErrorMessage("Controller Error Test");
        assertStacktracePresent();
    }

    public void testAuraError_ProdMode() throws Exception {
        open("/clientApiTest/auraError.app", Mode.PROD);
        findDomElement(By.cssSelector(".auraErrorButton")).click();
        assertDisplayedErrorMessage("Controller Error Test");
        assertNoStacktracePresent();
    }

    public void testAuraAssert_DevMode() throws Exception {
        open("/clientApiTest/auraError.app", Mode.DEV);
        findDomElement(By.cssSelector(".assertButton")).click();
        assertDisplayedErrorMessage("Controller Assert Test");
        assertStacktracePresent();
    }

    public void testAuraAssert_ProdMode() throws Exception {
        open("/clientApiTest/auraError.app", Mode.PROD);
        findDomElement(By.cssSelector(".assertButton")).click();
        assertDisplayedErrorMessage("Controller Assert Test");
        assertNoStacktracePresent();
    }

    // TODO(W-2520024): Update this test when we know exactly how we set the errorCode on AuraError
    public void _testAuraErrorWithErrorCode() throws Exception {
        String errorCode = "111222333444";
        open("/clientApiTest/auraError.app?errorCode=" + errorCode);
        findDomElement(By.cssSelector(".errorCodeButton")).click();
        assertDisplayedErrorMessage(errorCode);
    }

    /**
     * Stacktraces vary greatly across browsers so just verify there's more characters than the normal error message and
     * assume it's the stacktrace.
     */
    private void assertStacktracePresent() {
        String actualMessage = getText(ERROR_MSG_LOCATOR);
        assertTrue("Stacktrace not present on displayed error.", actualMessage.length() > 100);
    }

    /**
     * Only the standard error message plus message on Error should be displayed.
     */
    private void assertNoStacktracePresent() {
        String actualMessage = getText(ERROR_MSG_LOCATOR);
        assertTrue("Stacktrace should not be present on displayed error.", actualMessage.length() < 100);
    }

    private void assertDisplayedErrorMessage(String message) {
        waitForElement("Error mask should be visible when there is an error.", findDomElement(ERROR_MASK_LOCATOR), true);
        String actualMessage = getText(ERROR_MSG_LOCATOR);
        assertTrue("Did not find expected error in error message element. Expected <" + message + "> but got <"
                + actualMessage + ">.", actualMessage.contains(message));
    }
}
