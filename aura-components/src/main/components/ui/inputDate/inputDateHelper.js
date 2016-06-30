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
({
    setInitialValues : function (component) {
        // set default values for initial attributes in case they weren't provided.
        var timezone = component.get("v.timezone"),
            format = component.get("v.format"),
            langLocale = component.get("v.langLocale");

        if ($A.util.isEmpty(timezone)) {
            component.set("v.timezone", $A.get("$Locale.timezone"));
        }
        if ($A.util.isEmpty(format)) {
            component.set("v.format", $A.get("$Locale.dateFormat"));
        }
        if ($A.util.isEmpty(langLocale)) {
            component.set("v.langLocale", $A.get("$Locale.langLocale"));
        }
    },

    displayValue: function(component) {
        var value = component.get("v.value");
        var displayValue = value;
        var date;
        if (!$A.util.isEmpty(value)) {
            var langLocale = component.get("v.langLocale");
            // since v.value is in UTC format like "2015-08-10T04:00:00.000Z", we want to make sure the date portion is
            // valid
            var dateValue = value.split("T", 1)[0] || value;
            date = $A.localizationService.parseDateTimeUTC(dateValue, "YYYY-MM-DD", langLocale, true);
            if (!$A.util.isEmpty(date)) {
                var format = component.get("v.format"),
                    timezone = component.get("v.timezone"),
                    helper = this;
                var setDisplayValue = function (convertedDate) {
                    var translatedDate = $A.localizationService.translateToOtherCalendar(convertedDate);
                    displayValue = $A.localizationService.formatDateUTC(translatedDate, format, langLocale);

                    helper.setInputValue(component, displayValue);
                };

                this.convertToTimezone(value, timezone, $A.getCallback(setDisplayValue));
            }
        }

        if ($A.util.isEmpty(value) || $A.util.isEmpty(date)) {
            this.setInputValue(component, displayValue);
        }
    },

    displayDatePicker: function(component) {
        var useManager = component.get("v.useManager"),
            managerExists = component.get("v.managerExists");
        if (useManager && managerExists) {
            this.openDatepickerWithManager(component);
        } else {
            // if useManager was true but there is no manager, then set loadDatePicker back to true
            if (useManager && !managerExists) {
                this.loadDatePicker(component);
            }

            var datePicker = component.find("datePicker");
            if (datePicker && datePicker.get("v.visible") === false) {
                var currentDate = this.getDateValueForDatePicker(component);

                // if invalid text is entered in the inputText, currentDate will be null
                if (!$A.util.isUndefinedOrNull(currentDate)) {
                    datePicker.set("v.value", this.getDateString(currentDate));
                }
                datePicker.set("v.visible", true);
            }
        }
    },

    /**
     * Override ui:input.
     *
     */
    doUpdate : function(component, value) {
    	var localizedValue = $A.localizationService.translateFromLocalizedDigits(value);
        var formattedDate = localizedValue;
        if (value) {
            var langLocale = component.get("v.langLocale");
            var format = component.get("v.format");
            var date = $A.localizationService.parseDateTimeUTC(localizedValue, format, langLocale, true);

            if (date) {
                date = $A.localizationService.translateFromOtherCalendar(date);
                formattedDate = $A.localizationService.formatDateUTC(date, "YYYY-MM-DD");
            }
        }
        component.set("v.value", formattedDate);
    },

    /**
     * Override ui:input.
     */
    getInputElement : function(component) {
        var inputCmp = component.getConcreteComponent().find("inputText");
        if (inputCmp) {
            return inputCmp.getElement();
        }
        return component.getElement();
    },

    getDateValueForDatePicker: function(component) {
        var date;
        var format = component.get("v.format");
        var langLocale = component.get("v.langLocale");
        var dateString = this.getInputElement(component).value;
        if (!$A.util.isEmpty(dateString)) {
            date = $A.localizationService.parseDateTime(dateString, format, langLocale, true);
        }
        return date ? date : new Date();
    },

    getDateString: function(date) {
        return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
    },

    toggleClearButton: function(component) {
        if (($A.get("$Browser.isPhone") === true) || ($A.get("$Browser.isTablet") === true)) {
            var inputCmp = component.find("inputText");
            var inputElem = inputCmp ? inputCmp.getElement() : null;
            var clearCmp = component.find("clear");
            var clearElem = clearCmp ? clearCmp.getElement() : null;
            if (inputElem && clearElem) {
                var openIconCmp = component.find("datePickerOpener");
                var openIconElem = openIconCmp ? openIconCmp.getElement() : null;
                var currentValue = inputElem.value;
                if ($A.util.isUndefinedOrNull(currentValue) || $A.util.isEmpty(currentValue)) { // remove clear icon
                    $A.util.swapClass(clearElem, "display", "hide");

                    if (openIconElem) {
                        $A.util.swapClass(openIconElem, "hide", "display");
                    }
                } else {
                    $A.util.swapClass(clearElem, "hide", "display");
                    if (openIconElem) {
                        $A.util.swapClass(openIconElem, "display", "hide");
                    }
                }
            }
        }
    },

    /**
     * Show/hide open date picker icon based on v.disabled
     */
    toggleOpenIconVisibility: function(component) {
    	var openIconCmp = component.find("datePickerOpener"),
    	    openIconEl = openIconCmp ? openIconCmp.getElement() : null;
    	if (openIconEl) {
    	    if (component.get("v.disabled") === true) {
    	    	$A.util.swapClass(openIconEl, "display", "hide");
    	    } else {
                var clearCmp = component.find("clear");
                var clearElem = clearCmp ? clearCmp.getElement() : null;
                if (!clearElem || !$A.util.hasClass(clearElem, "display")) {
                    $A.util.swapClass(openIconEl, "hide", "display");
                }
    	    }
    	}
    },

    loadDatePicker: function(component) {
        if (!component.get("v.loadDatePicker")) {
            component.set("v.loadDatePicker", true);

            //datepicker has been loaded now, find it again and set it's reference element
            this.initializeDatePicker(component);
        }
    },

    initializeDatePicker: function (component) {
        var datePicker = component.find("datePicker");
        if (datePicker) {
            datePicker.set("v.referenceElement", component.find("inputText").getElement());
        }
    },

    checkManagerExists: function(component) {
        $A.getEvt('markup://ui:registerDatePickerManager').setParams({
            sourceComponentId : component.getGlobalId()
        }).fire();
    },

    openDatepickerWithManager: function(component) {
        var currentDate = this.getDateValueForDatePicker(component);

        $A.getEvt('markup://ui:showDatePicker').setParams({
            element  	: this.getInputElement(component),
            value      	: currentDate ? this.getDateString(currentDate) : currentDate,
            sourceComponentId : component.getGlobalId()
        }).fire();
    },

    setValue: function(component, event) {
        var dateValue = event.getParam("value") || event.getParam("arguments").value;
        if (dateValue) {
            component.set("v.value", dateValue);
        }
    },

    convertToTimezone: function(value, timezone, callback) {
        var date = $A.localizationService.parseDateTimeISO8601(value);
        if (!$A.util.isUndefinedOrNull(date)) {
            $A.localizationService.UTCToWallTime(date, timezone, callback);
        }
    },

    setInputValue: function(component, displayValue) {
        var inputElement = this.getInputElement(component);
        if (!$A.util.isUndefinedOrNull(inputElement)) {
            inputElement.value = displayValue ? $A.localizationService.translateToLocalizedDigits(displayValue) : "";
        }
    }

})// eslint-disable-line semi