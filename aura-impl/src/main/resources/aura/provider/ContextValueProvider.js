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
/*jslint sub: true */
/**
 * @description Context's Global ValueProvider. 
 * @constructor
 */
$A.ns.ContextValueProvider = function() {
    this.values = {}; 
};

/**
 * returns $Global values
 *
 * @protected
 * @return {Object} a copy of the internal store.
 */
$A.ns.ContextValueProvider.prototype.getValues = function() {
    var result = {};
    for (var key in this.values)  {
        if (this.values.hasOwnProperty(key)) {
            result[key] = this.extract(this.values[key]);
        }
    }
    return result;
};

/**
 * Returns a storable set of values.
 *
 * @private
 * @return {Object} a reference to the internal store.
 */
$A.ns.ContextValueProvider.prototype.getStorableValues = function() {
    return this.values;
};

$A.ns.ContextValueProvider.prototype.serializeForServer = function () {
    var serverValues = {};

    for (var key in this.values)  {
        if (this.values.hasOwnProperty(key)) {
            var current = this.values[key];

            if (current.hasOwnProperty("value")) {
                serverValues[key] = current["value"];
            }
        }
    }
    return serverValues;
};

/**
 * Merges $Global values.
 *
 * The incoming values must be from the server. We have special handling here to ensure that the
 * server does not overwrite values that are on the client.
 *
 * @private
 * @param {Object} values the new set of values to merge
 */
$A.ns.ContextValueProvider.prototype.merge = function(values) {
    for (key in values) {
        if (values.hasOwnProperty(key)) {
            var value = values[key];
            var old = undefined;
            if (this.values.hasOwnProperty(key)) {
                old = this.values[key];
            }
            if (!value || !value.hasOwnProperty("defaultValue")) {
                throw new Error("Invalid merge value at key '"+key+"' with value '"+value+"'");
            }
            if (value["writable"] && old && old.hasOwnProperty("value")) {
                value["value"] = old["value"];
            }
            this.values[key] = value;
            // Change notification.
            //var oldValue = this.extract(old);
            //var newValue = this.extract(value);
        }
    }
};

/**
 * Find value. If no value found, throw
 *
 * @public
 * @param {string} key - the key to retrieve
 * @return {Object} - the assigned of (if not assigned) default value
 */
$A.ns.ContextValueProvider.prototype.get = function(key) {
    if (this.values.hasOwnProperty(key) === false) {
        throw new Error("Attempting to retrieve an unknown global item '" + key + "'. Global items must be pre-registered and have a default value");
    }
    return this.extract(this.values[key]);
};

/**
 * set value by name. If no value item found, throw.  If not writable, throw
 *
 * @public
 * @param {string} key - the name of the key (must exist and be writable)
 * @param {Object} value - the value to set
 * @param {Boolean} ignoreChanges - should we ignore changes for change notification.
 * @return {Object} the value that was set.
 */
$A.ns.ContextValueProvider.prototype.set = function(key, value, ignoreChanges) {
    $A.assert(key.indexOf('.') == -1, "Unable to set value for key '" + key + "', did you add an extra '.'?");
    if ($A.util.isExpression(value)) {
        throw new Error("Unable to set global value '"+key+"' to the expression '"+value+"'. Global items must be constants");
    }
    if (this.values.hasOwnProperty(key) === false) {
        throw new Error("Attempting to set an unknown global item '" + key  + "'. Global items must be pre-registered and have a default value");
    }
    var gv = this.values[key];
    //var oldValue = this.extract(gv);
    if (gv && gv["writable"]) {
        gv["value"] = value;
    } else {
        throw new Error("Attempting to set a read only global item '" + key + "'");
    }
    // change event.
    return value;
};

/**
 * Extract the current value from the global value.
 *
 * @private
 * @param {Object} the global value (keys = [ "value", "defaultValue", "writable" ]
 * @return {Object} the value
 */
$A.ns.ContextValueProvider.prototype.extract = function(gv) {
    return gv && (gv.hasOwnProperty("value") ? gv["value"] : gv["defaultValue"]);  
};
