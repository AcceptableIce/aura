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

/**
 * @description The Aura Expression Service, accessible using $A.expressionService.
 * Processes Expressions.
 * @constructor
 * @export
 */
function AuraExpressionService() {}

/**
 * Trims markup syntax off a given string expression, removing
 * expression notation, and array notation.
 *
 * @param {Object}
 *            expression The expression to be normalized.
 * @returns {Object} The normalized string, or the input parameter, if
 *          it was not a string.
 * @export
 */
AuraExpressionService.prototype.normalize = function(expression) {

    if (typeof expression === "string") {

        expression = expression.trim();

        // Remove leading {! and {# as well as trailing } notation.
        if (expression.charAt(0) === "{" && expression.charAt(expression.length - 1) === "}" &&
            (expression.charAt(1) === "!" || expression.charAt(1) == "#")) {

            expression = expression.slice(2, -1).trim();
        }

        // Convert array notation from "attribute[index]" to "attribute.index".
        var startBrace = expression.indexOf('[');
        while(startBrace > -1) {
            var endBrace = expression.indexOf(']', startBrace + 1);
            if (endBrace > -1) {
                expression = expression.substring(0, startBrace) +
                    '.' + expression.substring(startBrace + 1, endBrace) +
                    expression.substring(endBrace + 1);
                startBrace = expression.indexOf('[', endBrace - 1);
            } else {
                startBrace = -1;
            }
        }
    }

    return expression;
};

/**
 * Resolves a hierarchical dot expression in string form against the
 * provided object if possible.
 *
 * @param {String}
 *            expression The string expression to be resolved.
 * @param {Object}
 *            container The object against which to resolve the
 *            expression.
 * @param {Boolean}
 *            rawValue Whether or not to evaluate expressions.
 * @returns {Object} The target of the expression, or undefined.
 * @export
 */
AuraExpressionService.prototype.resolve = function(expression, container, rawValue) {
    var target = container;
    var path = expression;
    if(!$A.util.isArray(path)) {
        path = path.split('.');
    }
    var segment;
    while (!$A.util.isUndefinedOrNull(target) && path.length) {
        segment = path.shift();
        //#if {"modes" : ["DEVELOPMENT"]}
        if(!target["hasOwnProperty"](segment)) {
            var searchkey = segment.toLowerCase();
            for(var key in target){
                if(target.hasOwnProperty(key) && key.toLowerCase() == searchkey) {
                    // You can't include container and target in the error, as it will json serialize it and causes a max iteration exception.
                    $A.error("Possible Case Sensitivity Issue: Expression '" + expression + "' on segment '" + segment + "'. Possible you meant '" + key + "'");
                    return;
                }
            }
        }
        //#end

        target = target[segment];

        if (!rawValue&&$A.util.isExpression(target)) {
            target = target.evaluate();
        }
    }
    return target;
};

/**
 * @export
 */
AuraExpressionService.prototype.create = function(valueProvider, config) {
    return valueFactory.create(config, null, valueProvider);
};

/**
 * @export
 */
// TODO: unify with above create method
AuraExpressionService.prototype.createPassthroughValue = function(primaryProviders, cmp) {
    return new PassthroughValue(primaryProviders, cmp);
};

Aura.Services.AuraExpressionService = AuraExpressionService;
