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
package org.auraframework.integration.test.components.ui.tooltip;

import org.auraframework.test.util.WebDriverTestCase;
import org.auraframework.test.util.WebDriverTestCase.ExcludeBrowsers;
import org.auraframework.test.util.WebDriverUtil.BrowserType;
import org.junit.Ignore;
import org.junit.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;

@ExcludeBrowsers({ BrowserType.ANDROID_PHONE, BrowserType.ANDROID_TABLET, BrowserType.IPHONE, BrowserType.IPAD, BrowserType.IE7, BrowserType.IE8})
public class TooltipUiTest extends WebDriverTestCase {
    private final String URL_FULL_CMP = "/uitest/tooltip_FullTest.cmp";

    /**
     * If tooltip is triggered by click then it should open and close by
     * pressing enter on keyboard
     * It's a flapper, fix and enable please: W-2846651. also remove testNothing() above.
     */
    @Ignore
    @Test
    public void testToolTipOpenAndCloseWithEnterKey() throws Exception {
        open(URL_FULL_CMP);
        WebElement trigger = findDomElement(By.cssSelector(".triggerClick"));

        // click on element to gain focus and verify tooltip opens
        trigger.click();
        waitForToolTipPresent();

        // close by sending enter key
        trigger.sendKeys(Keys.ENTER);
        waitForToolTipAbsent();

        // open by sending enter key
        trigger.sendKeys(Keys.ENTER);
        waitForToolTipPresent();
    }

    private void waitForToolTipPresent() {
        waitForElementAppear("Tooltip should been present but is not", By.cssSelector(".uiTooltipAdvanced.visible"));
    }

    private void waitForToolTipAbsent() {
        waitForElementDisappear("Tooltip should not be present but is", By.cssSelector(".uiTooltipAdvanced.visible"));
    }
}