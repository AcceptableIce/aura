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
 * @class The Aura Rendering Service, accessible using $A.renderingService.
 *        Renders components. The default behaviors can be customized in a
 *        client-side renderer.
 * @constructor
 */
$A.ns.AuraRenderingService = function() {
    this.visited = undefined;
    this.afterRenderStack = [];
    this.dirtyComponents = {};
    // KRIS: HALO: HACK:
    // IE11 is not returning the Object.keys() for dirtyComponents in the order they were added.
    // So we rerender dirty out of order.
    // This array assures we rerender in the order that we add keys to the array.
    // Ideally, we shouldn't care what order we rerender in, but that's a more difficult bug to track down in 194/patch
    this.dirtyComponentIds = [];
    this.needsCleaning = false;
};

/**
 * Renders a component by calling its renderer.
 *
 * @param {Component}
 *            components The component or component array to be rendered
 * @param {Component}
 *            parent Optional. The component's parent
 * @memberOf AuraRenderingService
 * @public
 */
$A.ns.AuraRenderingService.prototype.render = function(components, parent) {
    //#if {"modes" : ["STATS"]}
    var startTime = (new Date()).getTime();
    //#end

    components = this.getArray(components);
    var elements = [];
     
    for (var i=0; i < components.length; i++){
        var cmp = components[i];
        //JBUCH: HALO: FIXME: WE SHOULD REFUSE TO RENDER THINGS THAT AREN'T COMPONENTS
        //KRIS: HALO: This might be for component configs.
        if (!$A.util.isComponent(cmp)) {
            // If someone passed a config in, construct it.
            cmp = $A.componentService["newComponentDeprecated"](cmp, null, false, true);
            // And put the constructed component back into the array.
            components[i] = cmp;
        }
        // JBUCH: HALO: TODO: END REMOVE ME

        if(!$A.util.isComponent(cmp)) {
            $A.error("AuraRenderingService.render: 'cmp' must be a valid Component, found '" + cmp + "'.");
            components[i] = undefined;
            continue;
        }
        if (cmp.isValid()) {
            var renderedElements = cmp.render();
            renderedElements=this.finishRender(cmp, renderedElements);
            elements=elements.concat(renderedElements);
        }
    }

    this.insertElements(elements, parent);

    //#if {"modes" : ["STATS"]}
    this.statsIndex["render"].push({
        'component' : components,
        'startTime' : startTime,
        'endTime' : (new Date()).getTime()
    });
    //#end
    
    return elements;
};

/**
 * The default rerenderer for components affected by an event. Call
 * superRerender() from your customized function to chain the
 * rerendering to the components in the body attribute.
 *
 * @param {Component}
 *            components The component or component array to be rerendered
 * @memberOf AuraRenderingService
 * @public
 */
$A.ns.AuraRenderingService.prototype.rerender = function(components) {
    //#if {"modes" : ["STATS"]}
    var startTime = (new Date()).getTime();
    //#end

    var topVisit = false;
    var visited = this.visited;
    if(!visited) {
        visited = this.visited = {};
        topVisit = true;
    }


    var elements = [];

    components = this.getArray(components);
    for (var i = 0; i < components.length; i++) {
        var cmp = components[i];
        var id = cmp.getGlobalId();
        if (cmp.isValid()){
            var renderedElements=[];
            var addExistingElements=visited[id];
            if(!visited[id]) {
                if (cmp.isRendered()) {
                    var renderer = cmp.getRenderer();
                    var rerenderedElements = undefined;
                    try {
                        rerenderedElements=renderer.def.rerender(renderer.renderable);
                    } catch (e) {
                        $A.error("rerender threw an error in '"+cmp.getDef().getDescriptor().toString()+"'", e);
                        // we fall through here, and put whatever the component gives us in the set.
                        // This may not be ideal, but it is not clear what we should do.
                    }
                    if(rerenderedElements!=undefined){
                        renderedElements=renderedElements.concat(rerenderedElements);
                    }else{
                        addExistingElements=true;
                    }
                } else {
                    $A.error("Aura.RenderingService.rerender: attempt to rerender component that has not been rendered.");
                    continue;
                }
                visited[id] = true;
            }
            if(addExistingElements){
                renderedElements=renderedElements.concat(cmp.getElements());
            }
            elements=elements.concat(renderedElements);
        }
        this.cleanComponent(id);
    }

    //#if {"modes" : ["STATS"]}
    this.statsIndex["rerender"].push({
        'component' : components,
        'startTime' : startTime,
        'endTime' : (new Date()).getTime()
    });
    //#end

    if (topVisit) {
        this.visited = undefined;
        this.afterRender(this.afterRenderStack);
        this.afterRenderStack.length=0;
    }

    return elements;
};

/**
 * The default behavior after a component is rendered.
 *
 * @param {component}
 *            components The component or component array that has finished rendering
 * @memberOf AuraRenderingService
 * @public
 */
$A.ns.AuraRenderingService.prototype.afterRender = function(components) {
    //#if {"modes" : ["STATS"]}
    var startTime = (new Date()).getTime();
    //#end

    components = this.getArray(components);
    for(var i=0;i<components.length;i++){
        var cmp = components[i];
        if(!$A.util.isComponent(cmp)){
            $A.error("AuraRenderingService.afterRender: 'cmp' must be a valid Component, found '"+cmp+"'.");
            continue;
        }
        if(cmp.isValid()) {
            var renderer = cmp.getRenderer();
            try {
                renderer.def.afterRender(renderer.renderable);
            } catch (e) {
                // The after render routine threw an error, so we should
                //  (a) log the error
                $A.error("afterRender threw an error in '"+cmp.getDef().getDescriptor().toString()+"'", e);
                //  (b) mark the component as possibly broken.
                //  FIXME: keep track of component stability
            }
        }
    }

    //#if {"modes" : ["STATS"]}
    this.statsIndex["afterRender"].push({
        'component' : components,
        'startTime' : startTime,
        'endTime' : (new Date()).getTime()
    });
    //#end
};

/**
 * The default unrenderer that deletes all the DOM nodes rendered by a
 * component's render() function. Call superUnrender() from your
 * customized function to modify the default behavior.
 *
 * @param {Component}
 *            components The component or component array to be unrendered
 * @memberOf AuraRenderingService
 * @public
 */
$A.ns.AuraRenderingService.prototype.unrender = function(components) {
    if (!components) {
        return;
    }

    //#if {"modes" : ["STATS"]}
    var startTime = (new Date()).getTime();
    //#end
    var visited = this.visited;

    components = this.getArray(components);
    for (var i = 0; i < components.length; i++){
        var cmp = components[i];
        if (cmp.isValid() && cmp.isRendered()) {
            var renderer = cmp.getRenderer();
            cmp.setUnrendering(true);
            try {
                if(cmp.isValid()&&cmp.isRendered()) {
                    try {
                        renderer.def.unrender(renderer.renderable);
                    } catch (e) {
                        $A.error("Unrender threw an error in "+cmp.getDef().getDescriptor().toString(), e);
                    }
                    cmp.setRendered(false);
                    if (visited) {
                        visited[cmp.getGlobalId()] = true;
                    }
                }
            } finally {
                cmp.setUnrendering(false);
            }
        }
    }

    //#if {"modes" : ["STATS"]}
    this.statsIndex["unrender"].push({
        'component' : components,
        'startTime' : startTime,
        'endTime' : (new Date()).getTime()
    });
    //#end
};

/**
 * @private
 * @memberOf AuraRenderingService
 *
 * @param {Component} component the component for which we are storing the facet.
 * @param {Object} facet the component or array of components to store.
 */
$A.ns.AuraRenderingService.prototype.storeFacetInfo = function(component, facet) {
    if(!$A.util.isComponent(component)) {
        $A.error("Aura.RenderingService.storeFacet: 'component' must be a valid Component. Found '" + component + "'.");
    }
    if($A.util.isComponent(facet)){
        facet=[facet];
    }
    if(!$A.util.isArray(facet)) {
        $A.error("Aura.RenderingService.storeFacet: 'facet' must be a valid Array. Found '" + facet + "'.");
    }
    component._facetInfo=facet.slice(0);
};

/**
 * @private
 * @memberOf AuraRenderingService
 */
$A.ns.AuraRenderingService.prototype.getUpdatedFacetInfo = function(component, facet) {
    if(!$A.util.isComponent(component)) {
        $A.error("Aura.RenderingService.getUpdatedFacetInfo: 'component' must be a valid Component. Found '" + component + "'.");
    }
    if($A.util.isComponent(facet)){
        facet=[facet];
    }
    if(!$A.util.isArray(facet)){
        $A.error("Aura.RenderingService.getUpdatedFacetInfo: 'facet' must be a valid Array. Found '"+facet+"'.");
    }
    var updatedFacet={
        components:[],
        facetInfo:[],
        useFragment:false,
        fullUnrender:false
    };
    var renderCount=0;
    if(component._facetInfo) {
        for (var i = 0; i < facet.length; i++) {
            var child = facet[i];
            // Guard against undefined/null facets, as these will cause troubles later.
            if (child) {
                var found = false;
                for (var j = 0; j < component._facetInfo.length; j++) {
                    if (child === component._facetInfo[j]) {
                        updatedFacet.components.push({action:"rerender",component: child, oldIndex: j, newIndex: i});
                        if(j!=(i-renderCount)){
                            updatedFacet.useFragment=true;
                        }
                        found = true;
                        component._facetInfo[j] = undefined;
                        break;
                    }
                }
                if (!found) {
                    updatedFacet.components.push({action:"render",component: child, oldIndex: -1, newIndex: i});
                    renderCount++;
                }
                updatedFacet.facetInfo.push(child);
            }
        }
        if(!updatedFacet.components.length){
            updatedFacet.fullUnrender=true;
        }
        for (var x = 0; x < component._facetInfo.length; x++) {
            if (component._facetInfo[x]) {
                updatedFacet.components.unshift({action: "unrender",component: component._facetInfo[x], oldIndex: x, newIndex: -1});
            }
        }
    }
    return updatedFacet;
};

/**
 * @public
 * @param {Component} component the component for which we are rendering the facet.
 * @param {Component} facet the facet to render.
 * @param {Component} parent (optional) the parent for the facet.
 */
$A.ns.AuraRenderingService.prototype.renderFacet = function(component, facet, parent) {
    this.storeFacetInfo(component, facet);
    var ret=this.render(facet,parent);
    if(!ret.length){
        component._marker=ret[0]=this.createMarker(null,"render facet: " + component.getGlobalId());
    }else{
        component._marker=ret[0];
    }
    return ret;
};

/**
 * @public
 * @param {Component} component the component for which we are rendering the facet.
 * @param {Component} facet the facet to render.
 * @param {HTMLElement} referenceNode the reference node for insertion
 */
$A.ns.AuraRenderingService.prototype.rerenderFacet = function(component, facet, referenceNode) {
    var updatedFacet=this.getUpdatedFacetInfo(component,facet);
    var ret=[];
    var components=updatedFacet.components;
    var target=referenceNode||component._marker.parentNode;
    var calculatedPosition=0;
    var positionMarker=component._marker;
    var nextSibling=null;
    while(positionMarker.previousSibling){
        calculatedPosition++;
        positionMarker=positionMarker.previousSibling;
    }
    for(var i=0;i<components.length;i++){
        var info=components[i];
        var renderedElements=null;
        switch(info.action){
            case "render":
                renderedElements=this.render(info.component);
                if(updatedFacet.useFragment){
                    ret=ret.concat(renderedElements);
                }else if(renderedElements.length){
                    ret=ret.concat(renderedElements);
                    if(this.isMarker(component._marker)){
                        $A.util.removeElement(component._marker);
                    }
                    component._marker=ret[0];
                    nextSibling=target.childNodes[calculatedPosition];
                    this.insertElements(renderedElements,nextSibling||target,nextSibling,nextSibling);
                }
                calculatedPosition+=renderedElements.length;
                this.afterRenderStack.push(info.component);
                break;
            case "rerender":
                if(this.hasDirtyValue(info.component)){
                    renderedElements=this.rerender(info.component);
                }else{
                    renderedElements=info.component.getElements();
                }
                // KRIS: HALO: 
                // I anticipate this code going away when JohnBuch refactors the markers
                // to support nested renderIf.
                // The reason it is necessary is because when we rerender something like an iteration, it 
                // can have it's original marker unrendered, and thus it moves to the next element. Which 
                // can then be unrendered too, and so on and so on. Eventually the marker moves to the last element
                // but there may at this point be new elements in the iteration. So if you unrender the last element
                // and you rerender it's sub-components resulting in new elements, change its marker to the new elements
                //if(renderedElements.length && this.isMarker(component._marker)) {
                        // KRIS: HALO:
                        // We can't do this, some components share markers, and this can potentially 
                        // remove the marker for another component.
                    //$A.util.removeElement(component._marker);
                        
                        // KRIS: HALO: 
                        // Still failing things. Bleh.
                    //component._marker = renderedElements[0];
                //}
                
                info.component.disassociateElements();
                this.associateElements(info.component, renderedElements);
                ret = ret.concat(renderedElements);
                calculatedPosition+=renderedElements.length;
                //JBUCH: HALO: TODO: STILL NECESSARY?
                for(var r=0;r<renderedElements.length;r++){
                    this.addAuraClass(component, renderedElements[r]);
                }
                break;
            case "unrender":
                if (!this.isMarker(component._marker)) {
                    if (updatedFacet.fullUnrender || !component._marker.nextSibling) {
                        component._marker = this.createMarker(component._marker,"unrender facet: " + component.getGlobalId());
                    } else if (info.component.isValid() && info.component.getElement() === component._marker) {
                        component._marker = component._marker.nextSibling;
                    }
                }

                //JBUCH: HALO: TODO: FIND OUT WHY THIS CAN BE UNRENDERING A COMPONENTDEFREF AND FIX IT
                if ($A.util.isComponent(info.component) && info.component.isValid()) {
                    this.unrender(info.component);
                    info.component.disassociateElements();
                    this.cleanComponent(info.component.getGlobalId());
                    if(info.component.autoDestroy()){
                       info.component.destroy();
                    }
                }
                break;
        }
    }
    this.storeFacetInfo(component, updatedFacet.facetInfo);
    if(updatedFacet.useFragment) {
        nextSibling = target.childNodes[calculatedPosition];
        this.insertElements(ret,nextSibling || target, nextSibling, nextSibling);
    }

    // JBUCH: HALO: FIXME: THIS IS SUB-OPTIMAL, BUT WE NEVER WANT TO REASSOCIATE HTML COMPONENTS
    if (!component.isInstanceOf("aura:html")){
        component.disassociateElements();
        this.associateElements(component, ret);
    }
    return ret;
};

/**
 * @public
 * @param {Component} cmp the component for which we are unrendering the facet.
 * @param {Component} facet the facet to unrender.
 */
$A.ns.AuraRenderingService.prototype.unrenderFacet = function(cmp,facet){
    this.unrender(cmp._facetInfo);
    this.unrender(facet);
    this.storeFacetInfo(cmp, []);

    var elements = cmp.getElements();
    if(elements) {
        while(elements.length){
            $A.util.removeElement(elements.pop());
        }
    }
    cmp.disassociateElements();
};

/**
 * Get a marker for a component.
 *
 * @public
 * @param {Component} cmp the component for which we want a marker.
 * @return the marker.
 */
$A.ns.AuraRenderingService.prototype.getMarker = function(cmp){
    return cmp && cmp._marker;
};

/**
 * @protected
 * @param expression the expression to mark as dirty.
 * @param cmp the owning component.
 */
$A.ns.AuraRenderingService.prototype.addDirtyValue = function(expression, cmp) {
    this.needsCleaning = true;
    if (cmp && cmp.isValid() && cmp.isRendered()) {
        var id = cmp.getConcreteComponent().getGlobalId();
        var list = this.dirtyComponents[id];
        if (!list) {
            list = this.dirtyComponents[id] = {};
            this.dirtyComponentIds.push(id);
        }
        while(expression.indexOf('.')>-1){
            list[expression]=true;
            expression=expression.substring(0,expression.lastIndexOf('.'));
        }
    }
};

/**
 * Does a component have a dirty value?.
 *
 * Only used by component to figure out if it is dirty... Maybe we should move this to component?
 *
 * @protected
 * @param cmp the component to check.
 */
$A.ns.AuraRenderingService.prototype.hasDirtyValue = function(cmp){
   return this.dirtyComponents.hasOwnProperty(cmp.getConcreteComponent().getGlobalId());
};

/**
 * @protected
 */
$A.ns.AuraRenderingService.prototype.isDirtyValue = function(expression, cmp) {
    if (cmp && cmp.isValid()) {
        var id = cmp.getConcreteComponent().getGlobalId();
        var list = this.dirtyComponents[id];
        if (list && list[expression]){
            return true;
        }
    }
    return false;
};

/**
 * Rerender all dirty components.
 *
 * Called from ClientService when we reach the top of stack.
 *
 * @protected
 */
$A.ns.AuraRenderingService.prototype.rerenderDirty = function(stackName) {
    if (this.needsCleaning) {
        var maxiterations = 1000;
        var num = aura.getContext().incrementRender();
        var initialMarkName = "Rerendering-" + num;
        $A.Perf.mark(initialMarkName);
        $A.Perf.mark("Fired aura:doneRendering event");

        // #if {"modes" : ["PTEST","STATS"]}
        var allRerendered = [],
            startTime,
            cmpsWithWhy = {
            "stackName" : stackName,
            "components" : {}
        };
        // #end

        //KRIS: HALO:
        // If any components were marked dirty during a component rerender than
        // this.needsCleaning will be true.
        // maxiterations to prevent run away rerenderings from crashing the browser.
        while(this.needsCleaning && maxiterations) {
            var dirty = [];
            this.needsCleaning = false;
            maxiterations--;
                                
            while(this.dirtyComponentIds.length) {
                var id = this.dirtyComponentIds.shift();
                var cmp = $A.componentService.get(id);

                // uncomment this to see what's dirty and why. (please don't delete me again. it burns.)
                // $A.log(cmp.toString(), this.dirtyComponents[id]);

                if (cmp && cmp.isValid() && cmp.isRendered()) {
                    // We assert that we are not unrendering, as we should never be doing that, but we then check again, as in production we want to
                    // avoid the bug.
                    // JBUCH: HALO: TODO: INVESTIGATE THIS, IT SEEMS BROKEN
                    // For the moment, don't fail miserably here. This really is bad policy to allow things to occur on unrender that cause a re-render,
                    // but putting in the assert breaks code, so leave it out for the moment.

                    // aura.assert(!cmp.isUnrendering(), "Rerendering a component during unrender");
                    if (!cmp.isUnrendering()) {
                        dirty.push(cmp);

                        // KRIS: HALO:
                        // Since we never go through the renderFacet here, we don't seem
                        // to be calling afterRender
                        // But I could just be wrong, its complicated.
                        // Leaving this commented out for now till I can talk it over with JBUCH
                        //this.afterRenderStack.push(cmp);

                        // #if {"modes" : ["PTEST","STATS"]}
                        allRerendered.push(cmp);

                        cmpsWithWhy["components"][id] = {
                            "id" : id,
                            "descr" : cmp.getDef().getDescriptor().toString(),
                            "why" : this.dirtyComponents[id]
                        };
                        // #end
                    }
                } else {
                    this.cleanComponent(id);
                }
            }

            // #if {"modes" : ["STATS"]}
            startTime = startTime || (new Date()).getTime();
            // #end

            if (dirty.length) {
                this.rerender(dirty);
            }
        }

        //KRIS: HALO:
        // Somehow we did over 1000 rerenderings. Not just 1000 components, but one
        // component caused a rerender that caused a rerender, and on and on for 1000 times.
        if(!maxiterations) {
            $A.error("Max Callstack Exceeded: Rerendering loop resulted in to many rerenderings.");
        }
        // #if {"modes" : ["PTEST","STATS"]}
        if(allRerendered.length) {
            cmpsWithWhy["renderingTime"] = (new Date()).getTime() - startTime;
            this.statsIndex["rerenderDirty"].push(cmpsWithWhy);
        }
        // #end


        $A.Perf.endMark(initialMarkName);
        $A.get("e.aura:doneRendering").fire();
        $A.Perf.endMark("Fired aura:doneRendering event");

        // update the mark info after the fact to avoid unnecessary hits early to get cmp info
        // #if {"modes" : ["PTEST","STATS"]}
        var markDescription = initialMarkName + ": [";
        for (var m = 0; m < allRerendered.length; m++) {
            var rerenderedCmpDef = allRerendered[m].getDef();
            if (rerenderedCmpDef) {
                markDescription += "'" + rerenderedCmpDef.descriptor.getQualifiedName() + "'";
            }
            if (m < dirty.length - 1) {
                markDescription += ",";
            }
        }
        markDescription += "]";
        $A.Perf.updateMarkName(initialMarkName, markDescription);
        // #end
    }
};

/**
 * @deprecated
 * @protected
 */
$A.ns.AuraRenderingService.prototype.removeDirtyValue = function(value, cmp) {
    if (cmp && cmp.isValid()) {
        var id = cmp.getConcreteComponent().getGlobalId();
        var dirtyAttributes = this.dirtyComponents[id];
        if (dirtyAttributes) {
            if (dirtyAttributes[value]) {
                delete dirtyAttributes[value];
            }

            if ($A.util.isEmpty(dirtyAttributes)) {
                delete this.dirtyComponents[id];
                for (var i = 0; i < this.dirtyComponentIds.length; i++) {
                    if (this.dirtyComponentIds[i] === id) {
                        return this.dirtyComponentIds.splice(i, 1);
                    }
                }
            }
        }
    }
};

//#if {"modes" : ["PTEST","STATS"]}
$A.ns.AuraRenderingService.prototype.statsIndex = {
    "afterRender": [],
    "render": [],
    "rerender": [],
    "rerenderDirty": [],
    "unrender": []
};
//#end
//
$A.ns.AuraRenderingService.prototype.cleanComponent = function(id) {
    delete this.dirtyComponents[id];
};

/**
 * @private
 * @param things either an array or an item.
 * @return an array.
 */
$A.ns.AuraRenderingService.prototype.getArray = function(things) {
    if (!$A.util.isArray(things)) {
        return things?[things]:[];
    }
    return things;
};

/**
 * If a renderer returned a string, create html elements from that string.
 *
 * Returns an elements array, either the original one passed in or a new one
 * if "elements" passed in was a string, not an array.
 *
 * @private
 */
$A.ns.AuraRenderingService.prototype.evalStrings = function(elements) {
    if ($A.util.isString(elements)) {
        elements=$A.util.createElementsFromMarkup(elements);
    }
    return elements || [];
};

$A.ns.AuraRenderingService.prototype.finishRender = function(cmp, elements) {
    elements = this.evalStrings(elements);

    this.associateElements(cmp, elements);

    cmp.setRendered(true);
    this.cleanComponent(cmp.getGlobalId());

    return elements;
};

/**
 * Insert elements to the DOM, relative to a reference node,
 * by default as its last child.
 *
 * @private
 */
$A.ns.AuraRenderingService.prototype.insertElements = function(elements, refNode, asSibling, asFirst) {
    if (refNode) {
        if (asSibling) {
            if (asFirst) {
                $A.util.insertBefore(elements, refNode);
            } else {
                $A.util.insertAfter(elements, refNode);
            }
        } else {
            if (asFirst) {
                $A.util.insertFirst(elements, refNode);
            } else {
                $A.util.appendChild(elements, refNode); // Default
            }
        }
    }
};

$A.ns.AuraRenderingService.prototype.addAuraClass = function(cmp, element){
    var className = cmp.getConcreteComponent().getDef().getStyleClassName();

    if (className) {
        $A.util.addClass(element, className);
        if (element["tagName"]) {
            element["auraClass"] = $A.util.buildClass(element["auraClass"],className);
        }
    }
};

/**
 * Associate all of the elements with the component, and return a list of
 * pure elements - with no association objects wrapped around them.
 *
 * @private
 */
$A.ns.AuraRenderingService.prototype.associateElements = function(cmp, elements) {
    elements = this.getArray(elements);

    var len = elements.length;
    for (var i = 0; i < len; i++) {
        var element = elements[i];
        if(this.isMarker(element)){
            continue;
        }
        this.addAuraClass(cmp,element);
        cmp.associateElement(element);
    }
};

$A.ns.AuraRenderingService.prototype.createMarker = function(target,reason){
    var node = document.createComment(reason);
    node.aura_marker=true;
    if(target){
        $A.util.insertBefore(node, target);
    }
    return node;
};

$A.ns.AuraRenderingService.prototype.isMarker = function(node){
    return node&&node.aura_marker;
};

exp($A.ns.AuraRenderingService.prototype,
    "render", $A.ns.AuraRenderingService.prototype.render,
    "afterRender", $A.ns.AuraRenderingService.prototype.afterRender,
    "rerender", $A.ns.AuraRenderingService.prototype.rerender,
    "unrender", $A.ns.AuraRenderingService.prototype.unrender,
    "renderFacet", $A.ns.AuraRenderingService.prototype.renderFacet,
    "rerenderFacet", $A.ns.AuraRenderingService.prototype.rerenderFacet,
    "unrenderFacet", $A.ns.AuraRenderingService.prototype.unrenderFacet,
    "getMarker", $A.ns.AuraRenderingService.prototype.getMarker
);
