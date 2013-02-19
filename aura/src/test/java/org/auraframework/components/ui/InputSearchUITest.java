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
package org.auraframework.components.ui;

import org.auraframework.test.WebDriverTestCase;
import org.auraframework.test.WebDriverUtil.BrowserType;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

/**
 * UI Tests for inputSearch Component
 */
public class InputSearchUITest extends WebDriverTestCase {

    public InputSearchUITest(String name) {
        super(name);

    }

    // Excluding safari due to W-1478819
    @ExcludeBrowsers({ BrowserType.ANDROID_PHONE, BrowserType.ANDROID_TABLET, BrowserType.IPAD, BrowserType.IPHONE,
            BrowserType.SAFARI })
    public void testSearch() throws Exception {
        String valueExpression = auraUITestingUtil.getValueFromRootExpr("v.searched");
        valueExpression = auraUITestingUtil.prepareReturnStatement(valueExpression);
        open("/uitest/inputSearchHandlingSearchEvent.cmp");

        WebElement input = auraUITestingUtil.findElementAndTypeEventNameInIt("search");
        assertFalse("Search event should not have been triggered yet",
                auraUITestingUtil.getBooleanEval(valueExpression));
        auraUITestingUtil.pressEnter(input);
        assertTrue("Search event should have been triggered", auraUITestingUtil.getBooleanEval(valueExpression));
    }

    // Excluding safari due to W-1478819
    @ExcludeBrowsers({ BrowserType.ANDROID_PHONE, BrowserType.ANDROID_TABLET, BrowserType.IPAD, BrowserType.IPHONE,
            BrowserType.SAFARI })
    public void testClearSelection() throws Exception {
        String valueExpression = auraUITestingUtil.getValueFromRootExpr("v.searched");
        valueExpression = auraUITestingUtil.prepareReturnStatement(valueExpression);
        open("/uitest/inputSearchHandlingSearchEvent.cmp?showClear=true");

        WebElement input = auraUITestingUtil.findElementAndTypeEventNameInIt("search");
        assertEquals("The initial value in input Search is wrong", "search", input.getAttribute("value"));

        WebDriver d = getDriver();
        WebElement clearButton = d.findElement(By.cssSelector("button[class*='clear']"));
        assertTrue("input search clear button doesn't show up", clearButton.isDisplayed());

        auraUITestingUtil.pressEnter(clearButton);
        assertEquals("The input search term should be cleared", "", input.getAttribute("value"));
        assertTrue("input Search Search event should have been triggered",
                auraUITestingUtil.getBooleanEval(valueExpression));

    }
}
