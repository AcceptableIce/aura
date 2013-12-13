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
 * @namespace The Aura Component Service, accessible using $A.service.component.  Creates and Manages Components.
 * @constructor
 */
$A.ns.AuraComponentService = function(actions, finishedCallback) {
    this.registry = new ComponentDefRegistry();
    this.controllerDefRegistry = new ControllerDefRegistry();
    this.actionDefRegistry = new ActionDefRegistry();
    this.modelDefRegistry = new ModelDefRegistry();
    this.providerDefRegistry = new ProviderDefRegistry();
    this.rendererDefRegistry = new RendererDefRegistry();
    this.helperDefRegistry = new HelperDefRegistry();
    this.indexes = { globalId : {} };
    this.renderedBy = "auraRenderedBy";
};

/**
 * Gets an instance of a component.
 * @param {String} globalId
 * 				The generated globally unique Id of the component that changes across pageloads.
 * @memberOf AuraComponentService
 * @public
 */
$A.ns.AuraComponentService.prototype.get =  function(globalId) {
    var ret = this.indexes.globalId[globalId];
    return ret;
};

/**
 * Gets the rendering component for the provided element recursively.
 * @param {Object} element
 * 				The element that is used to find the rendering component
 * @memberOf AuraComponentService
 * @private
 */
$A.ns.AuraComponentService.prototype.getRenderingComponentForElement = function(element) {
    if ($A.util.isUndefinedOrNull(element)) { return null;}

    var ret;
    if ($A.util.hasDataAttribute(element, this.renderedBy)) {
        var id = $A.util.getDataAttribute(element, this.renderedBy);
        ret = this.get(id);
        $A.assert(!$A.util.isUndefinedOrNull(ret), "No component found for element with id : " + id);
    } else if(element.parentNode){
        ret = this.getRenderingComponentForElement(element.parentNode);
    }

    return ret;
};

/**
 * Gets the attribute provider for the provided element.
 * @param {Object} element
 * 				The element whose attribute provider is to be returned
 * @memberOf AuraComponentService
 * @private
 */
$A.ns.AuraComponentService.prototype.getAttributeProviderForElement = function(element) {
    return this.getRenderingComponentForElement(element).getAttributes().getValueProvider();
};

/**
 * Create a new component array.
 * @private
 */
$A.ns.AuraComponentService.prototype.newComponentArray = function(config, attributeValueProvider, localCreation, doForce){
    var ret = [];

    for(var i=0;i<config.length;i++){
        ret.push(this.newComponentDeprecated(config[i], attributeValueProvider, localCreation, doForce));
    }

    return ret;
};

/**
 * Deprecated. Replaced by newComponentAsync().
 * newComponent() calls newComponentDeprecated().
 * @param {Object} config
 * 				Use config to pass in your component definition and attributes. Supports lazy or exclusive loading by passing in "load": "LAZY" or "load": "EXCLUSIVE"
 * @param {Object} attributeValueProvider
 * 				The value provider for the attributes
 * @memberOf AuraComponentService
 * @public
 */
$A.ns.AuraComponentService.prototype.newComponent = function(config, attributeValueProvider, localCreation, doForce){
    return this.newComponentDeprecated(config, attributeValueProvider, localCreation, doForce);
};


/**
 * Deprecated. Replaced by newComponentAsync().
 * Creates a new component on the client or server and initializes it. For example <code>$A.services.component.newComponentDeprecated("ui:inputText")</code>
 * creates a <code>ui:inputText</code> component.
 * <p>See Also: <a href="#help?topic=dynamicCmp">Dynamically Creating Components</a></p>
 * @param {Object} config
 * 				Use config to pass in your component definition and attributes. Supports lazy or exclusive loading by passing in "load": "LAZY" or "load": "EXCLUSIVE"
 * @param {Object} attributeValueProvider
 * 				The value provider for the attributes
 * @memberOf AuraComponentService
 * @public
 */
$A.ns.AuraComponentService.prototype.newComponentDeprecated = function(config, attributeValueProvider, localCreation, doForce){
    $A.assert(config, "config is required in ComponentService.newComponentDeprecated(config)");

    if ($A.util.isArray(config)){
        return this.newComponentArray(config, attributeValueProvider, localCreation, doForce);
    }

    var configObj = this.getComponentConfigs(config, attributeValueProvider);

    var def = configObj["definition"],
        desc = configObj["descriptor"],
        load;

    config = configObj["configuration"];

    if(doForce !== true && !config["globalId"]){
        if(def && !def.hasRemoteDependencies() ){
            localCreation = true;
            delete config["load"];
        }else if(!config["load"]){
            load = "LAZY";
        }else{
            load = config["load"];
        }
    }

    if(desc === "markup://aura:placeholder"){
        load = null;
    }

    if (load === "LAZY" || load === "EXCLUSIVE") {
        localCreation = true;
        var oldConfig = config;
        config = {
            "componentDef": {
                "descriptor": "markup://aura:placeholder"
            },
            "localId": oldConfig["localId"],

            "attributes": {
                "values": {
                    "refDescriptor": desc,
                    "attributes": oldConfig["attributes"] ? oldConfig["attributes"]["values"] : null,
                    "exclusive": (oldConfig["load"] === "EXCLUSIVE")
                }
            }
        };
    }

    var ret = new Component(config, localCreation);
    ret.fire("init");
    return ret;
};


/**
 * Asynchronous version of newComponent(). Creates a new component and
 * calls your provided callback with the completed component regardless of any server-side dependencies.
 *
 * @param {Object} callbackScope The "this" context for the callback (null for global)
 * @param {Function} callback 
 * 						The callback to use once the component is successfully created
 * @param {Object} config
 * 						Required. The componentDef descriptor and attributes for the new component
 * @param {Object} attributeValueProvider
 * 						The value provider for the attributes
 * @param [localCreation]
 * @param [doForce]
 * @return {Component} The new component
 * @public
 * @memberOf AuraComponentService
 */
$A.ns.AuraComponentService.prototype.newComponentAsync = function(callbackScope, callback, config, attributeValueProvider, localCreation, doForce, forceServer){
    $A.assert(config, "config is required in ComponentService.newComponentAsync(config)");
    $A.assert($A.util.isFunction(callback),"newComponentAsync requires a function as the callback parameter");

    if ($A.util.isArray(config)){
        return this.newComponentArray(config, attributeValueProvider, localCreation, doForce);
    }

    var configObj = this.getComponentConfigs(config, attributeValueProvider);

    var def = configObj["definition"],
        desc = configObj["descriptor"];

    config = configObj["configuration"];

    config["componentDef"] = {
        "descriptor": desc
    };

    if ( !def || (def && def.hasRemoteDependencies()) || forceServer ) {
        this.requestComponent(callbackScope, callback, config, attributeValueProvider);
    } else {
        var newComp = this.newComponentDeprecated(config, attributeValueProvider, localCreation, doForce);
        callback.call(callbackScope, newComp);
    }
};

/**
 * Request component from server.
 *
 * @param config
 * @param callback
 * @private
 */
$A.ns.AuraComponentService.prototype.requestComponent = function(callbackScope, callback, config, avp) {
    var action = $A.get("c.aura://ComponentController.getComponent");
    var attributes = config["attributes"] ?
            (config["attributes"]["values"] ? config["attributes"]["values"] : config["attributes"])
            : null;
    var atts = {};

    //
    // Note to self, these attributes are _not_ Aura Values. They are instead either
    // a literal string or a (generic object) map.
    //
    for (var key in attributes) {
        var value = attributes[key];
        if (value && value.hasOwnProperty("value")) {
            value = value["value"];
        }
        // no def or component here, because we don't have one.
        var auraValue = valueFactory.create(value);
        atts[key] = this.computeValue(auraValue, avp);
    }

    action.setCallback(this, function(a){
        var newComp;
        if(a.getState() === "SUCCESS"){
            var returnedConfig = a.getReturnValue();
            if (!returnedConfig["attributes"]) {
                returnedConfig["attributes"] = {};
            }
            var merging = returnedConfig["attributes"];
            if (merging.hasOwnProperty("values")) {
                merging = merging["values"];
            }
            for (var mkey in attributes) {
                merging[mkey] = attributes[mkey];
            }
            returnedConfig["localId"] = config["localId"];

            newComp = $A.newCmpDeprecated(returnedConfig, avp, false);
        }else{
            var errors = a.getError();

            newComp = $A.newCmpDeprecated("markup://aura:text");
            if (errors) {
                newComp.getValue("v.value").setValue(errors[0].message);
            } else {
                newComp.getValue("v.value").setValue('unknown error');
            }
        }
        if ( $A.util.isFunction(callback) ) {
            callback.call(callbackScope, newComp);
        }
    });
    action.setParams({
        "name" : config["componentDef"]["descriptor"],
        "attributes" : atts
    });
    $A.enqueueAction(action);
};

/**
 * Evaluates value object into their literal values. Typically used to pass configs to server.
 * Iterates through MapValue. Recursion for nested value objects.
 *
 * @param valueObj Value Object
 * @param valueProvider value provider
 * @returns {*}
 */
$A.ns.AuraComponentService.prototype.computeValue = function(valueObj, valueProvider, raw) {
    // in case not value object, return
    if (!$A.util.isValue(valueObj)) {
        return valueObj;
    }

    var that = this;


    if ($A.util.instanceOf(valueObj, MapValue)) {

        var ret = {};
        // handle attributes with value provider in attributes
        if (valueObj.contains("valueProvider") && valueObj.contains("values")) {
            valueProvider = valueObj.getValue("valueProvider");
        }
        valueObj.each(function(k,v){
            // ignore valueProvider
            if (k !== "valueProvider") {
                ret[k] = that.computeValue(v, valueProvider, raw);
            }
        });
        return ret;

    } else if ($A.util.instanceOf(valueObj, ArrayValue)) {

        var arr = [];
        valueObj.each(function(item) {
            arr.push(that.computeValue(item, valueProvider, raw));
        });
        return arr;

    } else {

        // handle PassthroughValue in scenarios when they aren't used in iteration components
        if ("isExpression" in valueObj) {
            if (!valueObj.isExpression()) {
                return valueObj.unwrap();
            } else {
                var val = $A.expressionService.get(valueProvider, valueObj);
                // if raw return raw instead of "{!blah}"
                return raw ? val : val || valueObj.getValue();
            }
        } else {
            return null;
        }
    }
};

/**
 * Provides processed component config, definition, and descriptor.
 *
 * @param config
 * @param attributeValueProvider
 * @return {{configuration: {}, definition: ComponentDef, descriptor: String}}
 */
$A.ns.AuraComponentService.prototype.getComponentConfigs = function(config, attributeValueProvider) {
    if(config && $A.util.isString(config)){
        config = {"componentDef": config};
    }

    if (attributeValueProvider) {
        if(!config["attributes"]){
            config["attributes"] = {};
        }

        config["attributes"]["valueProvider"] = attributeValueProvider;
    }

    var def;
    var desc;

    def = this.getDef(config["componentDef"], true);

    if(def){
        desc = def.getDescriptor().toString();
    }else{
        desc = config["componentDef"]["descriptor"]? config["componentDef"]["descriptor"] : config["componentDef"];
    }

    return {
        "configuration": config,
        "definition": def,
        "descriptor": desc
    };
};

/**
 * Indexes the component using its global Id, which is uniquely generated across pageloads.
 * @private
 */
$A.ns.AuraComponentService.prototype.index = function(component){
    this.indexes.globalId[component.getGlobalId()] = component;
};

/**
 * Gets the component definition from the registry.
 * @param {Object} config The descriptor (<code>markup://ui:scroller</code>) or other component attributes that are provided during its initialization.
 * @param {Object} noInit
 * @returns {ComponentDef}  The metadata of the component
 * @memberOf AuraComponentService
 * @public
 */
$A.ns.AuraComponentService.prototype.getDef = function(config, noInit){
    return this.registry.getDef(config, noInit);
};

/**
 * Gets the component's controller definition from the registry.
 * @private
 */
$A.ns.AuraComponentService.prototype.getControllerDef = function(config){
    return this.controllerDefRegistry.getDef(config);
};

/**
 * Gets the action definition from the registry.
 * @private
 */
$A.ns.AuraComponentService.prototype.getActionDef = function(config){
    return this.actionDefRegistry.getDef(config);
};

/**
 * Gets the model definition from the registry.
 * @private
 */       
$A.ns.AuraComponentService.prototype.getModelDef = function(config){
    return this.modelDefRegistry.getDef(config);
};

/**
 * Gets the provider definition from the registry. A provider enables an abstract component definition to be used directly in markup.
 * @private
 */
$A.ns.AuraComponentService.prototype.getProviderDef = function(providerDefDescriptor, config){
    return this.providerDefRegistry.getDef(providerDefDescriptor, config);
};

/**
 * Gets the renderer definition from the registry.
 * @private
 */
$A.ns.AuraComponentService.prototype.getRendererDef = function(componentDefDescriptor, config){
    return this.rendererDefRegistry.getDef(componentDefDescriptor, config);
};

/**
 * Gets the helper definition from the registry.
 * @private
 */
$A.ns.AuraComponentService.prototype.getHelperDef = function(componentDefDescriptor, config, componentDef){
    return this.helperDefRegistry.getDef(componentDefDescriptor, config, componentDef);
};

/**
 * Destroys the components.
 * @private
 */
$A.ns.AuraComponentService.prototype.destroy = function(components){
    if (!aura.util.isArray(components)) {
        components = [components];
    }

    for (var i = 0; i < components.length; i++) {
        var cmp = components[i];
        if (cmp && cmp.destroy) {
            cmp.destroy();
        }
    }
};

/**
 * Removes the index of the component.
 * @private
 */
$A.ns.AuraComponentService.prototype.deIndex = function(globalId){ 
    delete this.indexes.globalId[globalId];
};

/**
 * Returns the descriptors of all components known to the registry.
 * @memberOf AuraComponentService
 * @private
 */
$A.ns.AuraComponentService.prototype.getRegisteredComponentDescriptors = function(){
    var ret = [];

    var componentDefs = this.registry.componentDefs;
    for (var name in componentDefs) {
        ret.push(name);
    }

    // Union in any locally cached component defs
    var catalog = this.registry.getLocalCacheCatalog();
    for (name in catalog) {
        if (!componentDefs[name]) {
            ret.push(name);
        }
    }

    return ret;
};

/**
 * @memberOf AuraComponentService
 * @private
 */
$A.ns.AuraComponentService.prototype.getIndex = function(){
    var ret = "";
    var index = this.indexes.globalId;
    for (var globalId in index) {
        if(globalId.indexOf(":1") > -1){
            var cmp = index[globalId];
            var par = "";
            var vp = cmp.getAttributes().getComponentValueProvider();
            if (vp) {
                par = vp.getGlobalId() + " : " + vp.getDef().toString();
            }
            ret = ret + globalId + " : ";
            ret = ret + cmp.getDef().toString();
            ret = ret + " [ " + par + " ] ";
            ret = ret + "\n";
        }
    }
    return ret;
};

$A.ns.AuraComponentService.prototype.getValue = $A.ns.AuraComponentService.prototype.get;

exp($A.ns.AuraComponentService.prototype,
    "get", $A.ns.AuraComponentService.prototype.get,
    "getRenderingComponentForElement", $A.ns.AuraComponentService.prototype.getRenderingComponentForElement,
    "getAttributeProviderForElement", $A.ns.AuraComponentService.prototype.getAttributeProviderForElement,
    "newComponent", $A.ns.AuraComponentService.prototype.newComponent,
    "newComponentDeprecated", $A.ns.AuraComponentService.prototype.newComponentDeprecated,
    "newComponentAsync", $A.ns.AuraComponentService.prototype.newComponentAsync,
    "getDef", $A.ns.AuraComponentService.prototype.getDef,
    "getRegisteredComponentDescriptors", $A.ns.AuraComponentService.prototype.getRegisteredComponentDescriptors,
    "getIndex", $A.ns.AuraComponentService.prototype.getIndex,
    "renderedBy", $A.ns.AuraComponentService.prototype.renderedBy,
    "computeValue", $A.ns.AuraComponentService.prototype.computeValue
);
