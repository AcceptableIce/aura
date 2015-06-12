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
package org.auraframework.components.ui.modalOverlay;

import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.util.List;

import org.auraframework.test.WebDriverTestCase;
import org.auraframework.test.WebDriverTestCase.ExcludeBrowsers;
import org.auraframework.test.WebDriverUtil.BrowserType;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;

@ExcludeBrowsers({ BrowserType.ANDROID_PHONE, BrowserType.ANDROID_TABLET, BrowserType.IPHONE, BrowserType.IPAD, BrowserType.IE7, BrowserType.IE8})
public class Panel2ModalOverlayUITest extends WebDriverTestCase {
	private final String APP = "/uitest/panel2_Test.app";
	private final String PARAM_PANEL_TYPE = "&testPanelType=";
	private final String FLAVOR = "&testFlavor=";
	private final String CREATE_PANEL_BUTTON = ".createPanelBtnClass";
	private final String PANEL_DIALOG = ".uiPanel";
    private final String PANEL_MODAL = ".uiModal";
    private final String CLOSE_BUTTON = ".closeBtn";
    private final String CLOSE_ON_CLICKOUT = ".inputcloseOnClickOutClass";	
    private final String MAKE_SCROLLABLE = ".inputMakeScrollableClass";
    private final String MAKE_NONSCROLLABLE = ".inputNonScrollableClass";
    private final String ENABLE_CUSTOM_CLOSEACTION = ".inputCustomizeCloseAction";
    private final String INPUT_PANELTYPE = ".inputPanelTypeClass";
    
    
    private final String ACTIVE_ELEMENT = "return $A.test.getActiveElement()";
    private final String APP_INPUT = ".appInput";
    
	public Panel2ModalOverlayUITest(String name) {
		super(name);
	}
	
	 /**
     * [Accessibility] modal closing on Esc key.
     * Bug: W-2617212
     */
    public void testPressEscKeyOnModal() throws Exception{
    	open(APP);
    	openPanel();
    	waitForModalOpen();
    	
    	WebElement activeElement = (WebElement) auraUITestingUtil.getEval(ACTIVE_ELEMENT);
    	activeElement.sendKeys(Keys.ESCAPE);
        waitForModalClose();
    }
    
    /**
     * [Accessibility] panel dialog closing on Esc key.
     * Revisit once Bug: W-2643030 is fixed
     */
    public void testPressEscKeyOnPanelDialog() throws Exception{
    	open(APP + "?" + PARAM_PANEL_TYPE + "panel");
    	openPanel();
    	waitForPanelDialogOpen();
    	
    	WebElement fistInputElement = findDomElements(By.cssSelector(INPUT_PANELTYPE)).get(1);
    	fistInputElement.click();
    	
    	fistInputElement.sendKeys(Keys.ESCAPE);
        waitForPanelDialogClose();
    }
    
    /**
     * Verify custom close action
     * Bug: W-2619406
     */
    public void testPressEscKeyOnPanelDialogWhenCloseActionSet() throws Exception{
    	open(APP + "?" + PARAM_PANEL_TYPE + "panel");
    	WebElement enableCustomCloseAction = findDomElement(By.cssSelector(ENABLE_CUSTOM_CLOSEACTION));
    	enableCustomCloseAction.click();
    	
    	openPanel();
    	waitForPanelDialogOpen();
    	
    	WebElement fistInputElement = findDomElements(By.cssSelector(INPUT_PANELTYPE)).get(1);
    	fistInputElement.click();
    	
    	fistInputElement.sendKeys(Keys.ESCAPE);
    	//ESC does not close the panel
    	waitForPanelDialogOpen();
    	String actionType = "closeOnEsc";
    	verifyCustomCloseActionMethodCalled(actionType);
    }
    
    private void verifyCustomCloseActionMethodCalled(String actionType) {
    	String panelGlobalId = findDomElements(By.cssSelector(".IdCreated")).get(0).getText();
    	String attrValueExp = auraUITestingUtil.getValueFromCmpExpression(panelGlobalId, "v.closeActionCalled");
        
    	String attrValueText = (String) auraUITestingUtil.getEval(attrValueExp);
    	String expectedText = String.format("CloseActionCustomMethodCalled when %s", actionType);
    	assertEquals("Custom close on Action method was not called", expectedText, attrValueText);
    }

	/**
     * Test modal does have scrollbar when content is not so long
     * Test case: W-2615146
     */
    public void testModalWithScrollBar() throws Exception{
    	verifyScrollbarPresent(true, MAKE_SCROLLABLE);
    }
    
    /**
     * Test modal does have scrollbar when content is not so long
     * Test case: W-2615146
     */
    public void testModalWithoutScrollBar() throws Exception{
    	verifyScrollbarPresent(false, MAKE_NONSCROLLABLE);
    }
    
    private void verifyScrollbarPresent(boolean hasScrollbar, String locator) throws MalformedURLException, URISyntaxException, InterruptedException {
    	open(APP);
    	String errorMessage = "Scroller should not be present for Modal body";
    	WebElement makeScrollable = findDomElement(By.cssSelector(locator));
    	makeScrollable.click();
    	
    	if(hasScrollbar){
    		errorMessage = "Scroller should be present for Modal body";
    	}
    	openPanel();
    	waitForModalOpen();
    	String bodyClassName = "modal-body";
    	boolean hasScroll = auraUITestingUtil.hasScrollBar(bodyClassName);
    	assertEquals(errorMessage, hasScrollbar, hasScroll);
   }

	/**
     * Test multiple modal one above another, should close top panel when we press ESC on the newest panel
     */
    public void testMultipleModalPressEscKey() throws Exception{
    	open(APP);
    	openPanel();
    	waitForModalOpen();
    	
    	//open second modal
    	openPanel(2);
    	waitForNumberOfPanels(PANEL_MODAL, 2);
    	
    	WebElement activeElement = (WebElement) auraUITestingUtil.getEval(ACTIVE_ELEMENT);
    	activeElement.sendKeys(Keys.ESCAPE);
    	waitForNumberOfPanels(PANEL_MODAL, 1);
    }
    
    /**
     * [Accessibility] panel dialog should not close when closeOnClickOut is not set to true
     */
    public void testPanelDialogWithCloseOnClickOutNotSet() throws Exception{
    	open(APP + "?" + 
    			PARAM_PANEL_TYPE + "panel");
    	openPanel();
    	waitForPanelDialogOpen();
    	
    	WebElement inputText = findDomElement(By.cssSelector(APP_INPUT));
		inputText.click();
    	waitForNumberOfPanels(PANEL_DIALOG, 1);
    }
    
    /**
     * [Accessibility] panel dialog should close when closeOnClickOut is set to true
     */
    public void testPanelDialogWithCloseOnClickOutSet() throws Exception{
    	open(APP + "?" + 
    			PARAM_PANEL_TYPE + "panel");
    	WebElement closeOutChexbox = findDomElement(By.cssSelector(CLOSE_ON_CLICKOUT));
    	closeOutChexbox.click();
    	openPanel();
    	waitForPanelDialogOpen();
    	
    	WebElement inputText = findDomElement(By.cssSelector(APP_INPUT));
		inputText.click();
    	waitForNumberOfPanels(PANEL_DIALOG, 0);
    }
    
    /**
     * Verify custom close action
     * Bug: W-2619406
     */
    public void testPanelDialogWithCloseOnClickOutSetAndCustomCloseActionSet() throws Exception{
    	open(APP + "?" + 
    			PARAM_PANEL_TYPE + "panel");
    	WebElement closeOutChexbox = findDomElement(By.cssSelector(CLOSE_ON_CLICKOUT));
    	closeOutChexbox.click();
    	WebElement enableCustomCloseAction = findDomElement(By.cssSelector(ENABLE_CUSTOM_CLOSEACTION));
        enableCustomCloseAction.click();
    	openPanel();
    	waitForPanelDialogOpen();
    	
    	WebElement inputText = findDomElement(By.cssSelector(APP_INPUT));
		inputText.click();
		//Click outside should not close the panel
        waitForPanelDialogOpen();
        
        String actionType = "closeOnClickOut";
        verifyCustomCloseActionMethodCalled(actionType);
    }
    
    /**
     * Tabs on Modal overlay should do focus trapping and not close the overlay
     */
    public void testModalFocusTrapping() throws Exception{
    	String panelType = "modal";
    	String url = APP + "?" + PARAM_PANEL_TYPE + panelType;
    	open(url);
    	cycleThroughPanelInputElements(url,"modal", false);
    }
    
    /**
     * Tabs on panel dialog should close the panel and not trap the focus within the panel
     */
    public void testPanelDoesNotDoFocusTrapping() throws Exception{
    	String panelType = "panel";
    	String url = APP + "?" + PARAM_PANEL_TYPE + panelType;
    	open(url);
    	cycleThroughPanelInputElements(url, "panel", true);
    }
    
    /**
     * Verify custom close action
     * Bug: W-2619406
     */
    public void testPanelTabOutCallsCustomCloseActionWhenSet() throws Exception{
    	String panelType = "panel";
    	String url = APP + "?" + PARAM_PANEL_TYPE + panelType;
    	open(url);
    	WebElement enableCustomCloseAction = findDomElement(By.cssSelector(ENABLE_CUSTOM_CLOSEACTION));
        enableCustomCloseAction.click();
    	cycleThroughPanelInputElements(url, "panel", false);
    	String actionType = "closeOnTabOut";
        verifyCustomCloseActionMethodCalled(actionType);
    }
    
    /**
     * Tabs on panel with full-screen should close the panel and not trap the focus within the panel
     */
    public void testPanelWithFullScreenDoesNotDoFocusTrapping() throws Exception{
    	String panelType = "panel";
    	String flavor = "full-screen";
    	String url = APP + "?" + PARAM_PANEL_TYPE + panelType + FLAVOR + flavor;
    	open(url);
    	cycleThroughPanelInputElements(url, "panel", true);
    }
    
    private void cycleThroughPanelInputElements(String url, String panelType, boolean doesPanelClose) throws Exception{
    	openPanel();
    	if (panelType.equals("modal")) {
    		waitForModalOpen();
    	} else {
    		waitForPanelDialogOpen();
    	}
    	List<WebElement> firstInput = findDomElements(By.cssSelector(INPUT_PANELTYPE));
    	firstInput.get(1).click();
    	WebElement activeElement = (WebElement) auraUITestingUtil.getEval(ACTIVE_ELEMENT);
    	//assertEquals("Focus should be on first element", panelType, auraUITestingUtil.getEval(ACTIVE_ELEMENT_TEXT));
    	int numElements = 23;
    	// cycle through input elements on panel
    	for (int i=1; i<numElements; i++) {
    		activeElement.sendKeys(Keys.TAB);
    		activeElement = (WebElement) auraUITestingUtil.getEval(ACTIVE_ELEMENT);
    	}
    	
    	// on close button
    	activeElement.sendKeys(Keys.TAB);
    	
    	if (doesPanelClose) {
    		if (panelType.equals("modal")) {
        		waitForModalClose();
        	} else {
        		waitForPanelDialogClose();
        	}
    	} else {
    		/*activeElement = (WebElement) auraUITestingUtil.getEval(ACTIVE_ELEMENT);
        	assertEquals("Panel should not be close and focus should be on first element", 
        			panelType, auraUITestingUtil.getEval(ACTIVE_ELEMENT_TEXT));*/
    		if (panelType.equals("modal")) {
        		waitForModalOpen();
        	} else {
        		waitForPanelDialogOpen();
        	}
    	}
    }
    
    private void openPanel() {
    	openPanel(1);
    }

    private void openPanel(int panelNumber) {
    	List<WebElement> createPanelBtn = findDomElements(By.cssSelector(CREATE_PANEL_BUTTON));
    	createPanelBtn.get(panelNumber-1).click();
    }
    
    @SuppressWarnings("unused")
	private void closePanel() {
    	WebElement closePanelBtn = getDriver().findElement(By.cssSelector(CLOSE_BUTTON));
    	closePanelBtn.click();
    }
    
    private void waitForModalOpen() throws InterruptedException {
    	waitForPanel(PANEL_MODAL, true);
    }
    
    private void waitForModalClose() throws InterruptedException {
    	waitForPanel(PANEL_MODAL, false);
    }
    
    private void waitForPanelDialogOpen() throws InterruptedException {
    	waitForPanel(PANEL_DIALOG, true);
    }
    
    private void waitForPanelDialogClose() throws InterruptedException {
    	waitForPanel(PANEL_DIALOG, false);
    }
    
    private void waitForPanel(String panelType, boolean isOpen) throws InterruptedException {
    	By locator = By.cssSelector(panelType);
    	pause(1000);
    	if (isOpen) {
    		List<WebElement> panels = findDomElements(locator);
    		assertNotNull(String.format("Panel %s is not open",panelType), panels);
    	} else {
    		assertFalse("Panel " + panelType + " is not open", isElementPresent(locator));
    	}
    }
    
    private void pause(long timeout) throws InterruptedException{
		Thread.sleep(timeout);
	}
    
    private void waitForNumberOfPanels(String panelType, int numPanels) throws InterruptedException {
    	pause(1000);
    	By locator = By.cssSelector(panelType);
    	if(numPanels!=0){
	    	List<WebElement> elements = findDomElements(locator);
	    	assertEquals("Number of panels open is incorrect", numPanels, elements.size());
    	}
    	else{
    		assertFalse("No panels should be opened", isElementPresent(locator));
    	}
    }
}
