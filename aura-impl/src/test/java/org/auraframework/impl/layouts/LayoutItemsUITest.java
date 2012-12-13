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

package org.auraframework.impl.layouts;

import java.util.concurrent.TimeUnit;

import org.auraframework.test.WebDriverTestCase;
import org.openqa.selenium.By;

/**
 * Automation for verifying Layouts.
 */
public class LayoutItemsUITest extends WebDriverTestCase {
    private By resultBtn1 = By.cssSelector(".Button1");
    private By resultBtn2 = By.cssSelector(".Button2");

    public LayoutItemsUITest(String name) {
        super(name);
    }

    /**
     * Verify that navigating forward and backward works when underlying LayoutsDef has multiple layoutitems per layout.
     * Automation for W-954182
     */
    public void testNavigationWhenLayoutHasMultipleLayoutItems() throws Exception {
        By forwardButton = By.cssSelector(".Forward_Button");
        By backButton = By.cssSelector(".Back_Button");
        By layoutDoneLocator = By.cssSelector(".layoutDone");

        open("/layoutServiceTest/multipleLayoutItems.app");
        getDriver().manage().timeouts().implicitlyWait(5, TimeUnit.SECONDS);
        findDomElement(layoutDoneLocator);
        verifyExpectedResultsForInitialLayout();

        findDomElement(forwardButton).click();
        findDomElement(layoutDoneLocator);
        verifyExpectedResultsForLayout1();

        findDomElement(forwardButton).click();
        findDomElement(layoutDoneLocator);
        verifyExpectedResultForLayout2();

        findDomElement(backButton).click();
        findDomElement(layoutDoneLocator);
        verifyExpectedResultsForLayout1();

        findDomElement(backButton).click();
        findDomElement(layoutDoneLocator);
        verifyExpectedResultsForInitialLayout();

        findDomElement(forwardButton).click();
        findDomElement(layoutDoneLocator);
        verifyExpectedResultsForLayout1();

        getDriver().navigate().back();
        verifyExpectedResultsForInitialLayout();
    }

    private void verifyExpectedResultsForInitialLayout() throws Exception {
        assertEquals("Ready to party?", findDomElement(resultBtn1).getText());
        assertEquals("", findDomElement(resultBtn2).getText());

    }

    private void verifyExpectedResultsForLayout1() throws Exception {
        assertEquals("Step1", getHashToken());
        assertEquals("Step 1a. Wear a Suit", findDomElement(resultBtn1).getText());
        assertEquals("Step 1b. Wear a Jacket", findDomElement(resultBtn2).getText());

    }

    private void verifyExpectedResultForLayout2() throws Exception {
        assertEquals("Step2", getHashToken());
        assertEquals("Step 2a. Start your car", findDomElement(resultBtn1).getText());
        assertEquals("Step 2b. Go party", findDomElement(resultBtn2).getText());
    }

    private String getHashToken() {
        String URL = getDriver().getCurrentUrl();
        assertTrue("URL does not contain a # token", URL.indexOf("#") > -1);
        String[] tokens = URL.split("#");
        assertEquals("URL has multiple # tokens", 2, tokens.length);
        return tokens[1];
    }
}
