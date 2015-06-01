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
function(w) {
      var transformFunctions = {
        center: function(inp, targetBox, elementBox) {
            return inp + 0.5 * targetBox.width; 
        },
        right: function(inp, targetBox, elementBox) {
            return inp + targetBox.width;
        },
        left: function(inp, targetBox, elementBox) {
            return inp;
        }
    };

    var Constraint = function(type, conf) {   
        var targetAlign;
        this._el = conf.element; 
        this._targetElement = conf.target;
        this._inputDirection = 'top';

        var pad = conf.pad || 0;


        var boxDirs = conf.boxDirections || {left:true, right: true};    

        // default is identity
        this._transformX = function(inp, targetBox, elementBox) {
            return inp;
        };

        this._transformY = function(inp, targetBox, elementBox) {
            return inp;
        };

        if(conf.targetAlign) {
            targetAlign = conf.targetAlign.split(/\s/);
            this._transformX = transformFunctions[targetAlign[0]];
            this._transformY = transformFunctions[targetAlign[1]];
        }

        var self = this;
        
        switch(type) {


            case 'center' :

                this._exp = function(targetBox, elementBox) {
                    
                    return {
                        left: self._transformX(targetBox.left, targetBox, elementBox) - 0.5 * elementBox.width
                    };
                };
                break;
            case 'north' : 
                this._exp = function(targetBox, elementBox) {

                    return {
                        top: targetBox.top - elementBox.height - pad
                    };
                };
                break;
            case 'south' :

                this._exp = function(targetBox, elementBox) {
                    return {
                        top: targetBox.bottom + pad
                    }
                }
                break;
            case 'middle' :
                this._exp = function(targetBox, elementBox) {
                    return {
                        top: 0.5 * (2 * targetBox.top + targetBox.height - elementBox.height)
                    }
                }
                break;
            case 'left' :
                this._exp = function(targetBox, elementBox) {
                    return {
                        left: self._transformX(targetBox.left, targetBox, elementBox) + pad
                    }
                }
                break;

            case 'right' :
                this._exp = function(targetBox, elementBox) {
                    return {
                        left: self._transformX(targetBox.left, targetBox, elementBox) - elementBox.width - pad
                    }
                }
                break;
            case 'below' :

                this._exp = function(targetBox, elementBox) {
                    if(elementBox.top < targetBox.top + targetBox.height + pad) {
                        return {
                            top: targetBox.top + targetBox.height + pad
                        }
                    }
                    
                }
                break;
            case 'bounding box':

                this._exp = function(targetBox, elementBox) {
                    var retBox = {};

                    if(boxDirs.top &&  elementBox.top + window.scrollY < targetBox.top + window.scrollY + pad) {
                        retBox.top = targetBox.top + window.scrollY + pad;
                    }

                    if(boxDirs.left && elementBox.left < targetBox.left + pad) {
                        retBox.left = targetBox.left + pad;
                    }

                    if(boxDirs.right && elementBox.left + elementBox.width > (targetBox.left + targetBox.width) - pad) {
                        // retBox.left = elementBox.left - (elementBox.right - targetBox.right);
                        retBox.left = (targetBox.left + targetBox.width) - elementBox.width - pad;
                    }
                    
                    if(boxDirs.bottom && elementBox.top + elementBox.height + window.scrollY > targetBox.top + targetBox.height +window.scrollY - pad) {
                        retBox.top = targetBox.bottom + window.scrollY - elementBox.height - pad; 
                    }

                    return retBox;

                }
                break;

            default:
                this._exp = function() {
                    console.error('no constraint expression for', type);
                }
         }
         

         if(conf && conf.enable === false) {
            this._disabled = true;
         } 
        
    };

    /**
     * Disabled the constraint
     */
    Constraint.prototype.detach = function() {
        this._disabled = true;
    }

    /**
     * enable the constraint
     */
    Constraint.prototype.attach = function() {
        this._disabled = false;
    }

    /**
     * update the values from the DOM
     */
    Constraint.prototype.updateValues = function() {
        if(!this._disabled) {
            this._targetElement.refresh();
            this._pendingBox = this._exp(this._targetElement, this._el);
        }
    }

    /**
     * Compute the new position
     */
    Constraint.prototype.reposition = function() {
        var el = this._el;
        if(!this._disabled) {
            for(var val in this._pendingBox) {
                el.set(val, this._pendingBox[val]);
            }
        }
        
    }

    /**
     * Compute the new position
     */
    Constraint.prototype.destroy = function() {
        this._el.release();
        this._targetElement.release();
        this._disabled = true;
    }


    return {
        Constraint: Constraint
    };
}