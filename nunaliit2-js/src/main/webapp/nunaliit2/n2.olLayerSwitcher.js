/* Copyright (c) 2006-2012 by OpenLayers Contributors (see authors.txt for 
 * full list of contributors). Published under the 2-clause BSD license.
 * See license.txt in the OpenLayers distribution or repository for the
 * full text of the license. */

;(function($,$n2){

// Localization
var _loc = function(str,args){ return $n2.loc(str,'nunaliit2',args); };


if( typeof(OpenLayers) !== 'undefined' ) {

/**
 * Class: OpenLayers.Control.LayerSwitcher
 * The LayerSwitcher control displays a table of contents for the map. This 
 * allows the user interface to switch between BaseLasyers and to show or hide
 * Overlays. By default the switcher is shown minimized on the right edge of 
 * the map, the user may expand it by clicking on the handle.
 *
 * To create the LayerSwitcher outside of the map, pass the Id of a html div 
 * as the first argument to the constructor.
 * 
 * Inherits from:
 *  - <OpenLayers.Control>
 */
OpenLayers.Control.NunaliitLayerSwitcher = 
  OpenLayers.Class(OpenLayers.Control, {

    /**  
     * Property: layerStates 
     * {Array(Object)} Basically a copy of the "state" of the map's layers 
     *     the last time the control was drawn. We have this in order to avoid
     *     unnecessarily redrawing the control.
     */
    layerStates: null,
    

  // DOM Elements
  
    /**
     * Property: layersDiv
     * {DOMElement} 
     */
    layersDiv: null,
    
    /** 
     * Property: baseLayersDiv
     * {DOMElement}
     */
    baseLayersDiv: null,

    /** 
     * Property: baseLayers
     * {Array(Object)}
     */
    baseLayers: null,
    
    
    /** 
     * Property: dataLbl
     * {DOMElement} 
     */
    dataLbl: null,
    
    /** 
     * Property: dataLayersDiv
     * {DOMElement} 
     */
    dataLayersDiv: null,

    /** 
     * Property: dataLayers
     * {Array(Object)} 
     */
    dataLayers: null,


    /** 
     * Property: minimizeDiv
     * {DOMElement} 
     */
    minimizeDiv: null,

    /** 
     * Property: maximizeDiv
     * {DOMElement} 
     */
    maximizeDiv: null,
    
    /**
     * APIProperty: ascending
     * {Boolean} 
     */
    ascending: true,
 
    /**
     * Constructor: OpenLayers.Control.LayerSwitcher
     * 
     * Parameters:
     * options - {Object}
     */
    initialize: function(options) {
        OpenLayers.Control.prototype.initialize.apply(this, arguments);
        this.layerStates = [];
    },

    /**
     * APIMethod: destroy 
     */    
    destroy: function() {
        
        //clear out layers info and unregister their events 
        this.clearLayersArray("base");
        this.clearLayersArray("data");
        
        this.map.events.un({
            addlayer: this.redraw,
            changelayer: this.redraw,
            removelayer: this.redraw,
            changebaselayer: this.redraw,
            scope: this
        });
        
        OpenLayers.Control.prototype.destroy.apply(this, arguments);
    },

    /** 
     * Method: setMap
     *
     * Properties:
     * map - {<OpenLayers.Map>} 
     */
    setMap: function(map) {
        OpenLayers.Control.prototype.setMap.apply(this, arguments);

        this.map.events.on({
            addlayer: this.redraw,
            changelayer: this.redraw,
            removelayer: this.redraw,
            changebaselayer: this.redraw,
            scope: this
        });
    },

    /**
     * Method: draw
     *
     * Returns:
     * {DOMElement} A reference to the DIV DOMElement containing the 
     *     switcher tabs.
     */  
    draw: function() {
        OpenLayers.Control.prototype.draw.apply(this);

        // create layout divs
        this.loadContents();

        // set mode to minimize
        if(!this.outsideViewport) {
            this.minimizeControl();
        }

        // populate div with current info
        this.redraw();    
        
        var _this = this;
        $(this.div).click(function(e){
        	var b = $(this);
        	_this.onButtonClick(e,b);
        });

        return this.div;
    },

    /**
     * Method: onButtonClick
     *
     * Parameters:
     * evt - {Event}
     */
    onButtonClick: function(evt) {
    	var $button = $(evt.target);
    	var layerSwitcherAttr = $button.attr('_layerSwitcher');
    	
        if( $button.hasClass('minimizeDiv') ) {
            this.minimizeControl();
            
        } else if( $button.hasClass('maximizeDiv') ) {
            this.maximizeControl();
            
        } else if( layerSwitcherAttr === this.id ) {
        	var forAttr = $button.attr('for')
            if( forAttr ) {
                $button = $('#'+forAttr);
            }
            if( false == $button.is(':disabled') ) {
            	var type = $button.attr('type');
                if( type === 'radio' ) {
                	var _layer = $button.attr('_layer');
                    $button.attr('checked','checked');
                    this.map.setBaseLayer(this.map.getLayer(_layer));
                } else {
                	if( $button.is(':checked') ){
                		$button.removeAttr('checked');
                	} else {
                        $button.attr('checked','checked');
                	};
                    this.updateMap();
                }
            }
        };
    },

    /** 
     * Method: clearLayersArray
     * User specifies either "base" or "data". we then clear all the
     *     corresponding listeners, the div, and reinitialize a new array.
     * 
     * Parameters:
     * layersType - {String}  
     */
    clearLayersArray: function(layersType) {
        this[layersType + "LayersDiv"].innerHTML = "";
        this[layersType + "Layers"] = [];
    },


    /**
     * Method: checkRedraw
     * Checks if the layer state has changed since the last redraw() call.
     * 
     * Returns:
     * {Boolean} The layer state changed since the last redraw() call. 
     */
    checkRedraw: function() {
        var redraw = false;
        if ( !this.layerStates.length ||
             (this.map.layers.length != this.layerStates.length) ) {
            redraw = true;
        } else {
            for (var i=0, len=this.layerStates.length; i<len; i++) {
                var layerState = this.layerStates[i];
                var layer = this.map.layers[i];
                if ( (layerState.name != layer.name) || 
                     (layerState.inRange != layer.inRange) || 
                     (layerState.id != layer.id) || 
                     (layerState.visibility != layer.visibility) ) {
                    redraw = true;
                    break;
                }    
            }
        }    
        return redraw;
    },
    
    /** 
     * Method: redraw
     * Goes through and takes the current state of the Map and rebuilds the
     *     control to display that state. Groups base layers into a 
     *     radio-button group and lists each data layer with a checkbox.
     *
     * Returns: 
     * {DOMElement} A reference to the DIV DOMElement containing the control
     */  
    redraw: function() {
        //if the state hasn't changed since last redraw, no need 
        // to do anything. Just return the existing div.
        if (!this.checkRedraw()) { 
            return this.div; 
        } 

        //clear out previous layers 
        this.clearLayersArray("base");
        this.clearLayersArray("data");
        
        var containsOverlays = false;
        var containsBaseLayers = false;
        
        // Save state -- for checking layer if the map state changed.
        // We save this before redrawing, because in the process of redrawing
        // we will trigger more visibility changes, and we want to not redraw
        // and enter an infinite loop.
        var len = this.map.layers.length;
        this.layerStates = new Array(len);
        for (var i=0; i <len; i++) {
            var layer = this.map.layers[i];
            this.layerStates[i] = {
                'name': layer.name, 
                'visibility': layer.visibility,
                'inRange': layer.inRange,
                'id': layer.id
            };
        }    

        var layers = this.map.layers.slice();
        if (!this.ascending) { layers.reverse(); }
        for(var i=0, len=layers.length; i<len; i++) {
            var layer = layers[i];
            var baseLayer = layer.isBaseLayer;

            if (layer.displayInLayerSwitcher) {

                if (baseLayer) {
                    containsBaseLayers = true;
                } else {
                    containsOverlays = true;
                }    

                // only check a baselayer if it is *the* baselayer, check data
                //  layers if they are visible
                var checked = (baseLayer) ? (layer == this.map.baseLayer)
                                          : layer.getVisibility();
    
                // create input element
                var inputId = $n2.getUniqueId();
                var $input = $('<input/>')
                	.attr('id',inputId)
                	.attr('_layer',layer.id)
                	.attr('_layerSwitcher',this.id)
                	.attr('defaultChecked',checked)
                	.val(layer.name)
                	.addClass('olButton')
                	;
                
                if( baseLayer ){
                	$input
                		.attr('type','radio')
                		.attr('name',this.id + '_baseLayers');
                } else {
                	$input
	            		.attr('type','checkbox')
	            		.attr('name',layer.name);
                };

                if( checked ) {
                	$input.attr('checked','checked');
                };

                if (!baseLayer && !layer.inRange) {
                	$input.attr('disabled','disabled');
                }
                
                // create span
                var $label = $('<label/>')
                	.attr('for',inputId)
                	.addClass('labelSpan')
                	.addClass('olButton')
                	.attr('_layerSwitcher',this.id)
                	.text(layer.name)
                	;

                if (!baseLayer && !layer.inRange) {
                	$label.addClass('n2layerSwitcher_outOfRange');
                };
                
                if( baseLayer ){
                	$label.addClass('n2layerSwitcher_alignBottom');
                } else {
                	$label.addClass('n2layerSwitcher_alignBaseline');
                };

                // create line break
                var br = document.createElement("br");
    
                
                var groupArray = (baseLayer) ? this.baseLayers
                                             : this.dataLayers;
                groupArray.push({
                    'layer': layer,
                    'inputElem': $input,
                    'labelSpan': $label
                });
                                                     
    
                var groupDiv = (baseLayer) ? this.baseLayersDiv
                                           : this.dataLayersDiv;
                $('<div/>')
                	.append($input)
                	.append($label)
                	.appendTo( $(groupDiv) );
            }
        }

        // if no overlays, dont display the overlay label
        this.dataLbl.style.display = (containsOverlays) ? "" : "none";        
        
        // if no baselayers, dont display the baselayer label
        this.baseLbl.style.display = (containsBaseLayers) ? "" : "none";        

        return this.div;
    },

    /** 
     * Method: updateMap
     * Cycles through the loaded data and base layer input arrays and makes
     *     the necessary calls to the Map object such that that the map's 
     *     visual state corresponds to what the user has selected in 
     *     the control.
     */
    updateMap: function() {

        // set the newly selected base layer        
        for(var i=0, len=this.baseLayers.length; i<len; i++) {
            var layerEntry = this.baseLayers[i];
            if (layerEntry.inputElem.is(':checked')) {
                this.map.setBaseLayer(layerEntry.layer, false);
            };
        };

        // set the correct visibilities for the overlays
        for(var i=0, len=this.dataLayers.length; i<len; i++) {
            var layerEntry = this.dataLayers[i];
            var checked = layerEntry.inputElem.is(':checked');
            layerEntry.layer.setVisibility(checked);
        };

    },

    /** 
     * Method: maximizeControl
     * Set up the labels and divs for the control
     * 
     * Parameters:
     * e - {Event} 
     */
    maximizeControl: function(e) {

        // set the div's width and height to empty values, so
        // the div dimensions can be controlled by CSS
        this.div.style.width = "";
        this.div.style.height = "";

        this.showControls(false);

        if (e != null) {
            OpenLayers.Event.stop(e);                                            
        }
    },
    
    /** 
     * Method: minimizeControl
     * Hide all the contents of the control, shrink the size, 
     *     add the maximize icon
     *
     * Parameters:
     * e - {Event} 
     */
    minimizeControl: function(e) {

        // to minimize the control we set its div's width
        // and height to 0px, we cannot just set "display"
        // to "none" because it would hide the maximize
        // div
        this.div.style.width = "0px";
        this.div.style.height = "0px";

        this.showControls(true);

        if (e != null) {
            OpenLayers.Event.stop(e);                                            
        }
    },

    /**
     * Method: showControls
     * Hide/Show all LayerSwitcher controls depending on whether we are
     *     minimized or not
     * 
     * Parameters:
     * minimize - {Boolean}
     */
    showControls: function(minimize) {

        this.maximizeDiv.style.display = minimize ? "" : "none";
        this.minimizeDiv.style.display = minimize ? "none" : "";

        this.layersDiv.style.display = minimize ? "none" : "";
    },
    
    /** 
     * Method: loadContents
     * Set up the labels and divs for the control
     */
    loadContents: function() {

        // layers list div        
        this.layersDiv = document.createElement("div");
        this.layersDiv.id = this.id + "_layersDiv";
        OpenLayers.Element.addClass(this.layersDiv, "layersDiv");

        this.baseLbl = document.createElement("div");
        this.baseLbl.innerHTML = _loc("Base Layer");
        OpenLayers.Element.addClass(this.baseLbl, "baseLbl");
        
        this.baseLayersDiv = document.createElement("div");
        OpenLayers.Element.addClass(this.baseLayersDiv, "baseLayersDiv");

        this.dataLbl = document.createElement("div");
        this.dataLbl.innerHTML = _loc("Overlays");
        OpenLayers.Element.addClass(this.dataLbl, "dataLbl");
        
        this.dataLayersDiv = document.createElement("div");
        OpenLayers.Element.addClass(this.dataLayersDiv, "dataLayersDiv");

        if (this.ascending) {
            this.layersDiv.appendChild(this.baseLbl);
            this.layersDiv.appendChild(this.baseLayersDiv);
            this.layersDiv.appendChild(this.dataLbl);
            this.layersDiv.appendChild(this.dataLayersDiv);
        } else {
            this.layersDiv.appendChild(this.dataLbl);
            this.layersDiv.appendChild(this.dataLayersDiv);
            this.layersDiv.appendChild(this.baseLbl);
            this.layersDiv.appendChild(this.baseLayersDiv);
        }    
 
        this.div.appendChild(this.layersDiv);

        // maximize button div
        var img = OpenLayers.Util.getImageLocation('layer-switcher-maximize.png');
        this.maximizeDiv = OpenLayers.Util.createAlphaImageDiv(
                                    "OpenLayers_Control_MaximizeDiv", 
                                    null, 
                                    null, 
                                    img, 
                                    "absolute");
        OpenLayers.Element.addClass(this.maximizeDiv, "maximizeDiv olButton");
        this.maximizeDiv.style.display = "none";
        
        this.div.appendChild(this.maximizeDiv);

        // minimize button div
        var img = OpenLayers.Util.getImageLocation('layer-switcher-minimize.png');
        this.minimizeDiv = OpenLayers.Util.createAlphaImageDiv(
                                    "OpenLayers_Control_MinimizeDiv", 
                                    null, 
                                    null, 
                                    img, 
                                    "absolute");
        OpenLayers.Element.addClass(this.minimizeDiv, "minimizeDiv olButton");
        this.minimizeDiv.style.display = "none";

        this.div.appendChild(this.minimizeDiv);
    },
    
    CLASS_NAME: "OpenLayers.Control.LayerSwitcher"
});

}; // if(typeof(OpenLayers) !== 'undefined')

})(jQuery,nunaliit2);