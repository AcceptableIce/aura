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
/*jslint sub: true, evil : true */
/**
 * @description Creates a RendererDef instance.
 * @constructor
 * @protected
 */
function RendererDef(descriptor){
    var componentClass = $A.componentService.getComponentClass(descriptor);

    if(componentClass) {
        var ccPrototype = componentClass.prototype;

        // If we didn't directly define a render method for the component
        // we'll use the default one on the Component prototype
        // If we don't do this, then it'll use an inherited render method.
        if(!ccPrototype.hasOwnProperty("render")) {     ccPrototype["render"] = ccPrototype.render; }
        if(!ccPrototype.hasOwnProperty("afterRender")){ ccPrototype["afterRender"] = ccPrototype.afterRender; }
        if(!ccPrototype.hasOwnProperty("rerender")) {   ccPrototype["rerender"] = ccPrototype.rerender; }
        if(!ccPrototype.hasOwnProperty("unrender")) {   ccPrototype["unrender"] = ccPrototype.unrender; }

        this.renderMethod = ccPrototype["render"];
        this.afterRenderMethod  = ccPrototype["afterRender"];
        this.rerenderMethod = ccPrototype["rerender"];
        this.unrenderMethod = ccPrototype["unrender"];

        //#if {"excludeModes" : ["PRODUCTION", "PRODUCTIONDEBUG"]}
        this["renderMethod"] = this.renderMethod;
        this["afterRenderMethod"] = this.afterRenderMethod;
        this["rerenderMethod"] = this.rerenderMethod;
        this["unrenderMethod"] = this.unrenderMethod;
        //#end
    }
}

/**
 * Gets the renderer methods recursively in the component's hierarchy.
 * @param {Component} component The component associated with the renderer.
 */
RendererDef.prototype.render = function RendererDef$Render(component) {
    var renderer = component.getRenderer();
    if (this.renderMethod) {
        return this.renderMethod.call(component);
    }
    if (renderer["superRender"]) {
        return renderer["superRender"]();
    }
    return null;
};

/**
 * Gets the methods after the render method recursively in the component's hierarchy.
 * @param {Component} component The component associated with the renderer.
 */
RendererDef.prototype.afterRender = function RendererDef$AfterRender(component) {
    var renderer = component.getRenderer();
    if (this.afterRenderMethod) {
        this.afterRenderMethod.call(component);
    } else if (renderer["superAfterRender"]) {
        renderer["superAfterRender"]();
    }
};

/**
 * Gets the rerenderer methods recursively in the component's hierarchy.
 * @param {Component} component The component associated with the renderer.
 */
RendererDef.prototype.rerender = function RendererDef$Rerender(component) {
    var renderer = component.getRenderer();
    if (this.rerenderMethod) {
        return this.rerenderMethod.call(component);
    } else if (renderer["superRerender"]) {
        return renderer["superRerender"]();
    }
};

/**
 * Revert the render by removing the DOM elements.
 * @param {Component} component The component associated with the renderer.
 */
RendererDef.prototype.unrender = function RendererDef$Unrender(component) {
    var renderer = component.getRenderer();
    if (this.unrenderMethod) {
        this.unrenderMethod.call(component);
    } else if (renderer["superUnrender"]) {
        renderer["superUnrender"]();
    } else {
        // TODO: iterate over components attributes and recursively unrender facets
        var elements = component.getElements();
        if(elements) {
            while(elements.length){
                $A.util.removeElement(elements.pop());
            }
        }
        component.disassociateElements();
    }
};

Aura.Renderer.RendererDef = RendererDef;