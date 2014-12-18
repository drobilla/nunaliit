/*
Copyright (c) 2014, Geomatics and Cartographic Research Centre, Carleton 
University
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

 - Redistributions of source code must retain the above copyright notice, 
   this list of conditions and the following disclaimer.
 - Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
 - Neither the name of the Geomatics and Cartographic Research Centre, 
   Carleton University nor the names of its contributors may be used to 
   endorse or promote products derived from this software without specific 
   prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
POSSIBILITY OF SUCH DAMAGE.

*/

;(function($,$n2,$d) {
"use strict";

var 
 _loc = function(str,args){ return $n2.loc(str,'nunaliit2',args); }
 ,DH = 'n2.forceGraph'
 ;
 
//--------------------------------------------------------------------------
 var Popup = $n2.Class({
 	
 	showService: null,
 	
 	delay: null,
 	
 	initialize: function(opts_){
 		var opts = $n2.extend({
 			showService: null
 			,delay: null
 		},opts_);
 		
 		this.showService = opts.showService;
 		this.delay = opts.delay;
 		
 		if( $.fn.qtip ){
 			// OK
 		} else {
 			throw 'qTip2 library is not available';
 		};
 	},
 	
 	installPopup: function(domElem, doc){
 		var _this = this;
 		
 		var $elem = $(domElem);
 		
 		var qtipOptions = {
 			content:{
 				text: function(event, api){
 					var html = null;
 					
 					_this._generateHtml(doc,function(h){
 						if( html ){
 							// already returned
 							api.set('content.text',h);
 						};
 						html = h;
 					});
 					
 					if( !html ){
 						html = '<div class="olkit_wait"></div>';
 					};
 					
 					return html;
 				}
 			}
 		};
 		
 		if( this.delay ){
 			qtipOptions.content.delay = this.delay;
 		};
 		
 		$elem.qtip(qtipOptions);
 	},
 	
 	_generateHtml: function(doc, cb){
 		var $outer = $('<div>');
 		var $elem = $('<span class="n2_popup">')
 			.appendTo($outer);
 		this.showService.displayBriefDescription($elem, {}, doc);
 		var html = $outer.html();
 		cb(html);
 	}
 });
 
 //--------------------------------------------------------------------------
 var Node = $n2.Class({
 	isNode: null,
 	
 	n2_id: null,

 	n2_doc: null,
 	
 	n2_geometry: null,
 	
 	initialize: function(doc){
 		this.isNode = true;
 		this.n2_doc = doc;
 		this.n2_id = doc._id;
 		this.n2_geometry = 'point';
 	},

 	getDocId: function(){
 		return this.n2_doc._id;
 	},
 	
 	setDoc: function(doc){
 		if( doc._id === this.n2_doc._id ){
 			this.n2_doc = doc;
 		};
 	}
 });

 //--------------------------------------------------------------------------
 var Link = $n2.Class({
 	isLink: null,

 	n2_doc: null,

 	sourceDocId: null,

 	targetDocId: null,

 	source: null,
 	
 	target: null,
 	
 	n2_id: null,
 	
 	n2_geometry: null,
 	
 	
 	linkId: null,
 	
 	initialize: function(doc, sourceDocId, targetDocId){
 		this.n2_doc = doc;
 		this.n2_id = doc._id;
 		this.isLink = true;
 		this.n2_geometry = 'line';
 		
 		if( sourceDocId < targetDocId ){
 			this.sourceDocId = sourceDocId;
 			this.targetDocId = targetDocId;
 		} else {
 			this.sourceDocId = targetDocId;
 			this.targetDocId = sourceDocId;
 		};
 		
 		this.linkId = this.sourceDocId + '|' + this.targetDocId;
 	},
 	
 	setDoc: function(doc){
 		if( doc._id === this.n2_doc._id ){
 			this.n2_doc = doc;
 		};
 	},

 	getDocId: function(){
 		return this.n2_doc._id;
 	},

 	getSourceDocId: function(){
 		return this.sourceDocId;
 	},

 	getTargetDocId: function(){
 		return this.targetDocId;
 	},

 	getSource: function(){
 		return this.source;
 	},

 	setSource: function(source){
 		if( source.n2_id === this.sourceDocId ){
 			this.source = source;
 		};
 	},
 	
 	getTarget: function(){
 		return this.target;
 	},

 	setTarget: function(target){
 		if( target.n2_id === this.targetDocId ){
 			this.target = target;
 		};
 	}
 });

 //--------------------------------------------------------------------------
 var SettingsWidget = $n2.Class({
 	
 	elemId: null,
 	
 	modelId: null,
 	
 	dispatchService: null,
 	
 	parameters: null,
 	
 	parametersByEventId: null,
 	
 	addresses: null,
 	
 	initialize: function(opts_){
 		var opts = $n2.extend({
 			modelId: null
 			,dispatchService: null
 			,elemId: null
 			,style: null
 		},opts_);
 		
 		var _this = this;
 		
 		this.modelId = opts.modelId;
 		this.dispatchService = opts.dispatchService;
 		this.parameters = [];
 		this.parametersByEventId = {};
 		this.addresses = [];
 		
 		var modelInfo = null;
 		if( this.dispatchService ){
 			var m = {
 				type: 'modelGetInfo'
 				,modelId: this.modelId
 				,modelInfo: null
 			};
 			this.dispatchService.synchronousCall(DH, m);
 			modelInfo = m.modelInfo;
 		};
 		
 		var handleFn = function(m, addr, dispatcher){
 			_this._handle(m, addr, dispatcher);
 		};
 		
 		if( modelInfo && modelInfo.parameters ){
 			for(var i=0,e=modelInfo.parameters.length; i<e; ++i){
 				var paramInfo = modelInfo.parameters[i];
 				this.parameters.push(paramInfo);
 				if( paramInfo.changeEvent ){
 					this.parametersByEventId[paramInfo.changeEvent] = paramInfo;
 				};
 				if( paramInfo.setEvent ){
 					this.parametersByEventId[paramInfo.setEvent] = paramInfo;
 					var addr = this.dispatchService.register(DH, paramInfo.setEvent, handleFn);
 					this.addresses.push(addr);
 				};
 				if( paramInfo.getEvent ){
 					this.parametersByEventId[paramInfo.getEvent] = paramInfo;
 				};
 			};
 		};
 		
 		if( this.parameters.length > 0 ){
 			this.elemId = $n2.getUniqueId();
 			var $outer = $('<div>')
 				.attr('id',this.elemId)
 				.addClass('n2ForceGraph_settings')
 				.appendTo( $('#'+opts.elemId) );
 			
 			if( opts.style ){
 				for(var name in opts.style){
 					var value = opts.style[name];
 					if( value ){
 						$outer.css(name,value);
 					};
 				};
 			};
 			
 			$('<div>')
 				.addClass('n2ForceGraph_settings_button')
 				.appendTo($outer).
 				click(function(){
 					_this._togglePanel();
 				});
 			
 			$('<div>')
 				.addClass('n2ForceGraph_settings_panel')
 				.appendTo($outer);
 			
 			this._hidePanel();
 			
 			this._refresh();
 		};
 	},
 	
 	_refresh: function(){
 		var $elem = this._getElem();
 		var $panel = $elem.find('.n2ForceGraph_settings_panel');
 		$panel.empty();
 		
 		for(var i=0,e=this.parameters.length; i<e; ++i){
 			var parameterInfo = this.parameters[i];
 			this._addParameter($panel, parameterInfo);
 		};
 	},
 	
 	_addParameter: function($elem, parameterInfo){
 		var _this = this;
 		var inputId = $n2.getUniqueId();
 		var $div = $('<div>')
 			.addClass('n2ForceGraph_settings_line')
 			.appendTo($elem);
 		
 		// Obtain current value
 		var m = {
 			type: parameterInfo.getEvent
 			,parameterId: parameterInfo.id
 		};
 		this.dispatchService.synchronousCall(DH, m);
 		var value = m.value;
 		
 		if( parameterInfo.type === 'boolean' ){
 			// Checkbox
 			var $inputDiv = $('<div>')
 				.addClass('n2ForceGraph_settings_line_input')
 				.appendTo($div);
 			var $input = $('<input>')
 				.attr('type','checkbox')
 				.attr('id',inputId)
 				.appendTo($inputDiv)
 				.change(function(){
 					var selected = $('#'+inputId).is(':checked');
 					var m = {
 						type: parameterInfo.changeEvent
 						,parameterId: parameterInfo.id
 						,value: selected
 					};
 					_this.dispatchService.send(DH, m);
 				});
 			if( value ){
 				$input.attr('checked','checked');
 			};
 		};
 		
 		// Label
 		var label = _loc(parameterInfo.label);
 		var $labelDiv = $('<div>')
 			.addClass('n2ForceGraph_settings_line_label')
 			.appendTo($div);
 		$('<label>')
 			.attr('for',inputId)
 			.text(label)
 			.appendTo($labelDiv);
 	},
 	
 	_togglePanel: function(){
 		var $elem = this._getElem();
 		var $panel = $elem.find('.n2ForceGraph_settings_panel');
 		
 		if( $panel.hasClass('n2ForceGraph_settings_panel_on') ){
 			this._hidePanel();
 		} else {
 			this._showPanel();
 		};
 	},
 	
 	_showPanel: function(){
 		var $elem = this._getElem();
 		var $panel = $elem.find('.n2ForceGraph_settings_panel');
 		$panel.removeClass('n2ForceGraph_settings_panel_off');
 		$panel.addClass('n2ForceGraph_settings_panel_on');
 	},
 	
 	_hidePanel: function(){
 		var $elem = this._getElem();
 		var $panel = $elem.find('.n2ForceGraph_settings_panel');
 		$panel.removeClass('n2ForceGraph_settings_panel_on');
 		$panel.addClass('n2ForceGraph_settings_panel_off');
 	},
 	
 	_getElem: function(){
 		return $('#'+this.elemId);
 	},
 	
 	_handle: function(m, addr, dispatcher){
 		// Check if widget was remove
 		var $elem = this._getElem();
 		if( $elem.length < 1 ){
 			// De-register events
 			for(var i=0,e=this.addresses.length; i<e; ++i){
 				var address = this.addresses[i];
 				dispatcher.deregister(address);
 			};
 			this.addresses = [];
 			return;
 		};
 		
 		this._refresh();
 	}
 });

 //--------------------------------------------------------------------------
 var ModelParameter = $n2.Class({

 	model: null,

 	modelId: null,

 	parameterId: null,
 	
 	name: null,
 	
 	label: null,
 	
 	updateFn: null,
 	
 	dispatchService: null,
 	
 	eventNameSet: null,
 	
 	eventNameGet: null,
 	
 	eventNameChange: null,
 	
 	initialize: function(opts_){
 		var opts = $n2.extend({
 			model: null
 			,modelId: null // optional
 			,name: null
 			,label: null
 			,updateFn: null
 			,dispatchService: null
 		},opts_);
 		
 		var _this = this;
 		
 		this.model = opts.model;
 		this.modelId = opts.modelId;
 		this.name = opts.name;
 		this.label = opts.label;
 		this.updateFn = opts.updateFn;
 		this.dispatchService = opts.dispatchService;
 		
 		if( !this.modelId ){
 			this.modelId = $n2.getUniqueId('parameter_');
 		};
 		
 		if( !this.label ){
 			this.label = this.name;
 		};
 		
 		this.parameterId = this.modelId + '_' + this.name;
 		this.eventNameSet = this.parameterId + '_set';
 		this.eventNameGet = this.parameterId + '_get';
 		this.eventNameChange = this.parameterId + '_change';
 		
 		if( this.dispatchService ){
 			var fn = function(m, addr, dispatcher){
 				_this._handle(m, addr, dispatcher);
 			};
 			this.dispatchService.register(DH, this.eventNameChange, fn);
 			this.dispatchService.register(DH, this.eventNameGet, fn);
 		};
 	},
 	
 	getInfo: function(){
 		var info = {
 			parameterId: this.parameterId
 			,type: 'boolean'
 			,name: this.name
 			,label: this.label
 			,setEvent: this.eventNameSet
 			,getEvent: this.eventNameGet
 			,changeEvent: this.eventNameChange
 		};
 		
 		var effectiveValue = this.model[this.name];
 		info.value = effectiveValue;
 		
 		return info;
 	},
 	
 	_handle: function(m, addr, dispatcher){
 		if( m.type === this.eventNameChange ){
 			var value = m.value;
 			
 			this.model[this.name] = value;
 			if( this.updateFn ){
 				this.updateFn.call(this.model, this.name, value);
 			};
 			
 			var effectiveValue = this.model[this.name];
 			var reply = {
 				type: this.eventNameSet
 				,parameterId: this.parameterId
 				,value: effectiveValue
 			};
 			this.dispatchService.send(DH, reply);
 			
 		} else if( m.type === this.eventNameGet ){
 			var effectiveValue = this.model[this.name];
 			m.value = effectiveValue;
 		};
 	}
 });

 // --------------------------------------------------------------------------
 var ForceGraph = $n2.Class({

 	canvasId: null,
 	
 	interactionId: null,
 	
 	svgId: null,
 	
 	modelId: null,
 	
 	atlasDesign: null,
 	
 	dispatchService: null,

 	showService: null,
 	
 	sourceModelId: null,
 	
 	moduleDisplay: null,
 	
 	svgRenderer: null,
 	
 	background: null,
 	
 	forceOptions: null,
 	
 	forceLayout: null,
 	
 	intentView: null,
 	
 	styleRules: null,
 	
 	popup: null,
 	
 	nodesById: null,
 	
 	activeLinkArrayById: null,
 	
 	inactiveLinkArrayById: null,
 	
 	currentMouseOver: null,

 	lastDocIdSelected: null,
 	
 	sticky: null,
 	
 	initialize: function(opts_){
 		var opts = $n2.extend({
 			canvasId: null
 			,interactionId: null
 			,config: null
 			,moduleDisplay: null
 			,sourceModelId: null
 			,background: null
 			,force: {}
 			,popup: null
 			,styleRules: null
 			,toggleSelection: true
 			,onSuccess: function(){}
 			,onError: function(err){}
 		},opts_);
 		
 		var _this = this;
 	
 		this.canvasId = opts.canvasId;
 		this.interactionId = opts.interactionId;
 		this.moduleDisplay = opts.moduleDisplay;
 		this.sourceModelId = opts.sourceModelId;
 		this.background = opts.background;
 		this.toggleSelection = opts.toggleSelection;
 		
 		this.modelId = $n2.getUniqueId('forceGraph');
 		
 		this.forceOptions = $n2.extend({
 			gravity: 0.1
 			,friction: 0.9
 			,theta: 0.8
 			,charge: -30
 			,chargeDistance: null
 			,linkDistance: 30
 			,linkStrength: 1
 		},opts.force);
 		
 		this.styleRules = $n2.styleRule.loadRulesFromObject(opts.styleRules);
 		
 		var config = opts.config;
 		if( config ){
 			this.atlasDesign = config.atlasDesign;
 			
 			if( config.directory ){
 				this.dispatchService = config.directory.dispatchService;
 				this.showService = config.directory.showService;
 			};
 		};
 		
 		try {
	 		if( opts.popup && this.showService ){
	 			var popupOptions = $n2.extend({
	 					delay: null
	 				}
	 				,opts.popup
	 				,{
	 					showService: this.showService
	 				}
	 			);
	 			this.popup = new Popup(popupOptions);
	 		};
 		} catch(err) {
 			$n2.log('ForceGraph can not install popup: '+err);
 		};

 		// Sticky parameter
 		this.sticky = false;
 		this.stickyParameter = new ModelParameter({
 			model: this
 			,modelId: this.modelId
 			,name: 'sticky'
 			,label: _loc('Sticky Nodes')
 			,updateFn: this._updateParameter
 			,dispatchService: this.dispatchService
 		});

 		this.nodesById = {};
 		this.activeLinkArrayById = {};
 		this.inactiveLinkArrayById = {};
 		this.currentMouseOver = null;
 		this.lastDocIdSelected = null;
 		this.focusInfo = null;
 		this.selectInfo = null;
 		
 		// Register to events
 		if( this.dispatchService ){
 			var f = function(m){
 				_this._handleDispatch(m);
 			};
 			
 			this.dispatchService.register(DH,'selected',f);
 			this.dispatchService.register(DH,'unselected',f);
 			this.dispatchService.register(DH,'modelGetInfo',f);
 			this.dispatchService.register(DH,'modelStateUpdated',f);
// 			this.dispatchService.register(DH,'focusOn',f);
// 			this.dispatchService.register(DH,'focusOff',f);
 		};
 		
 		this.forceLayout = $d.layout.force()
 			.gravity(this.forceOptions.gravity)
 			.friction(this.forceOptions.friction)
 			.theta(this.forceOptions.theta)
 			.charge(this.forceOptions.charge)
 			.linkDistance(this.forceOptions.linkDistance)
 			.linkStrength(this.forceOptions.linkStrength)
 			;
 		if( this.forceOptions.chargeDistance ){
 			this.forceLayout.chargeDistance(this.forceOptions.chargeDistance);
 		};
 		this.forceLayout.drag()
 			.on('dragstart',function(d){
 				if( _this.sticky ){
 					d.fixed = true;
 				};
 			});
 		
 		this.createGraph();
 		
 		// Create user intent view
 		this.intentView = new $n2.userIntentView.IntentView({
 			dispatchService: this.dispatchService
 		});
 		this.intentView.addListener(function(changedNodes){
 			_this._intentViewUpdated(changedNodes);
 		});
 		
 		opts.onSuccess();

 		if( this.sourceModelId ){
 			if( this.dispatchService ){
 				var msg = {
 					type: 'modelGetState'
 					,modelId: this.sourceModelId
 					,state: null
 				};
 				this.dispatchService.synchronousCall(DH,msg);
 				if( msg.state ){
 					this._dbPerspectiveUpdated(msg.state);
 				};
 			};
 		};

 		// Setting widget
 		var settingWidget = new SettingsWidget({
 			modelId: this.modelId
 			,dispatchService: this.dispatchService
 			,elemId: this.canvasId
 			,style: null
 		});
 		
 		$n2.log('forceGraph',this);
 		$n2.log('settingWidget',settingWidget);
 	},
 	
 	createGraph: function() {
 		var _this = this; // for use in callbacks

 		if( this.background 
 		 && typeof this.background.color === 'string' ){
 			var $canvas = $('#' + this.canvasId);
 			$canvas.css('background-color',this.background.color);
 		};
 		
 		this.svgId = $n2.getUniqueId();
 		var $svg = $d.select('#' + this.canvasId)
 			.append('svg')
 			.attr('id',this.svgId);

 		$svg.append('g')
 			.attr('class','links');

 		$svg.append('g')
 			.attr('class','nodes');
 		
 		this.svgRenderer = new $n2.svg.Renderer({
 			svgElem: $svg[0][0]
 		});
 		//this.svgRenderer._importGraphic('star');
 		
 		this.resizeGraph();
 	},
 	
 	getGraphSize: function() {
 		var $canvas = $('#' + this.canvasId);
 		
 		var width = $canvas.width();
 		var height = $canvas.height();
 		
 		/*
 		 * apply minimum sizes
 		 */
// 		if (width < this.options.sizes.canvas_min.width) {
// 			width = this.options.sizes.canvas_min.width;
// 		};
// 		if (height < this.options.sizes.canvas_min.height) {
// 			height = this.options.sizes.canvas_min.height;
// 		};
 		return [width, height];
 	},
 	
 	resizeGraph: function() {
 		var size = this.getGraphSize();
 		
 		this.forceLayout.size([size[0], size[1]]).start();
 		
 		this._getSvgElem()
 			.attr('width', size[0])
 			.attr('height', size[1]);
 	},
 	
 	_getSvgElem: function() {
 		return $d.select('#' + this.svgId);
 	},
 	
 	_documentsUpdated: function(updatedNodeData, updatedLinkData){
 		var _this = this;
 		
 		var nodes = [];
 		for(var docId in this.nodesById){
 			var node = this.nodesById[docId];
 			nodes.push(node);
 		};

 		var links = [];
 		for(var docId in this.activeLinkArrayById){
 			var activeLinkArray = this.activeLinkArrayById[docId];
 			links.push.apply(links,activeLinkArray);
 		};

 		this.forceLayout
 			.nodes(nodes)
 			.links(links)
 			.start();
 		
 		var selectedNodes = this._getSvgElem().select('g.nodes').selectAll('.node')
 			.data(nodes, function(node){ return node.n2_id; });
 		
 		var createdNodes = selectedNodes.enter()
 			.append(function(){
 				var args = arguments;
 				return this.ownerDocument.createElementNS(this.namespaceURI, "circle");
 			})
 			.attr('class','node')
 			.on('click', function(n,i){
 				var doc = n.n2_doc;
 				_this._initiateMouseClick(doc);
 			})
 			.on('mouseover', function(n,i){
 				var doc = n.n2_doc;
 				_this._initiateMouseOver(doc);
 			})
 			.on('mouseout', function(n,i){
 				var doc = n.n2_doc;
 				_this._initiateMouseOut(doc);
 			})
 			.call(this.forceLayout.drag)
 			.each(function(datum,i){
 				var $elem = $(this);
 				if( _this.popup ){
 					_this.popup.installPopup(this,datum.n2_doc);
 				};
 			})
 			;
 		this._adjustElementStyles(createdNodes);
 		
 		selectedNodes.exit()
 			.remove();
 		
 		var updatedNodes = this._getSvgElem().select('g.nodes').selectAll('.node')
 			.data(updatedNodeData, function(node){ return node.n2_id; });
 		this._adjustElementStyles(updatedNodes);

 		var selectedLinks = this._getSvgElem().select('g.links').selectAll('.link')
 			.data(links, function(link){ return link.linkId; });

 		var createdLinks = selectedLinks.enter()
 			.append('line')
 			.attr('class','link')
 			.on('click', function(n,i){
 				var doc = n.n2_doc;
 				_this._initiateMouseClick(doc);
 			})
 			.on('mouseover', function(n,i){
 				var doc = n.n2_doc;
 				_this._initiateMouseOver(doc);
 			})
 			.on('mouseout', function(n,i){
 				var doc = n.n2_doc;
 				_this._initiateMouseOut(doc);
 			})
 			;
 		this._adjustElementStyles(createdLinks);
 		
 		selectedLinks.exit()
 			.remove();
 		
 		var updatedLinks = this._getSvgElem().select('g.links').selectAll('.link')
 			.data(updatedLinkData, function(link){ return link.linkId; });
 		this._adjustElementStyles(updatedLinks);

 		this.forceLayout.on('tick', function(e) {

 			// Deal with find event
 			var width = $('#' + _this.canvasId).width();
 			var height = $('#' + _this.canvasId).height();
 			var midX = width / 2;
 			var midY = height / 2;
 			selectedNodes.each(function(n,i){
 				if( n.n2_found ){
 					if( n.x > midX ){
 						var k = (n.x - midX) / 2;
 						n.x -= k;
 					} else {
 						var k = (midX - n.x) / 2;
 						n.x += k;
 					};
 					if( n.y > midY ){
 						var k = (n.y - midY) / 2;
 						n.y -= k;
 					} else {
 						var k = (midY - n.y) / 2;
 						n.y += k;
 					};
 				};
 			});
 			
 			selectedNodes
 				.attr('cx', function(d) { return d.x; })
 				.attr('cy', function(d) { return d.y; });
 			
 			selectedLinks.attr("x1", function(d) { return d.source.x; })
 		        .attr("y1", function(d) { return d.source.y; })
 		        .attr("x2", function(d) { return d.target.x; })
 		        .attr("y2", function(d) { return d.target.y; });		
 		});
 	},
 	
 	_adjustElementStyles: function(selectedElements){
 		var _this = this;
 		selectedElements.each(function(n,i){
 			var symbolizer = _this.styleRules.getSymbolizer(n);
 			symbolizer.adjustSvgElement(this,n);
 		});
 	},
 	
 	_dispatch: function(m){
 		var d = this.dispatchService;
 		if( d ){
 			d.send(DH,m);
 		};
 	},
 	
 	_dbPerspectiveUpdated: function(opts_){
 		var opts = $n2.extend({
 			added: null
 			,updated: null
 			,removed: null
 		},opts_);
 		
 		var elementsAdded = [];
 		var elementsRemoved = [];
 		var nodesUpdated = [];
 		var linksUpdated = [];
 		var updatedRequired = false;

 		if( opts.added ){
 			for(var i=0,e=opts.added.length; i<e; ++i){
 				var doc = opts.added[i];

 				var node = this._createNodeFromDocument(doc);
 				if( node ){
 					this.nodesById[doc._id] = node;
 					elementsAdded.push(node);
 					updatedRequired = true;
 				};

 				var links = this._createLinksFromDocument(doc);
 				if( links && links.length > 0 ){
 					this._addLinksToInactiveList(links);
 					elementsAdded.push.apply(elementsAdded, links);
 					updatedRequired = true;
 				};
 			};
 		};

 		if( opts.updated ){
 			for(var i=0,e=opts.updated.length; i<e; ++i){
 				var doc = opts.updated[i];

 				// Nodes
 				var updatedNode = this._createNodeFromDocument(doc);
 				var currentNode = this.nodesById[doc._id];
 				if( currentNode && !updatedNode ){
 					// Removed due to update
 					delete this.nodesById[doc._id];
 					elementsRemoved.push(currentNode);
 					updatedRequired = true;

 				} else if( !currentNode && updatedNode ){
 					// Added due to update
 					this.nodesById[doc._id] = updatedNode;
 					elementsAdded.push(currentNode);
 					updatedRequired = true;
 				
 				} else if( currentNode && updatedNode ){
 					currentNode.setDoc(doc);
 					nodesUpdated.push(currentNode);
 					updatedRequired = true;
 				};
 				
 				// Compute updated links
 				var updatedLinksById = {};
 				var links = this._createLinksFromDocument(doc);
 				if( links ){
 					for(var j=0,k=links.length; j<k; ++j){
 						var link = links[j];
 						updatedLinksById[link.linkId] = link;
 					};
 				};
 				
 				// Check links
 				var links = this._getLinksFromDocId(doc._id);
 				for(var j=0,k=links.length; j<k; ++j){
 					var link = links[j];
 					if( updatedLinksById[link.linkId] ){
 						// Updated
 						link.setDoc(doc);
 						linksUpdated.push(link);
 						delete updatedLinksById[link.linkId];
 						updatedRequired = true;
 					} else {
 						// Removed
 						this._removeLink(link);
 						elementsRemoved.push(link);
 						updatedRequired = true;
 					};
 				};
 				
 				// What is left in updatedLinksById are new links
 				var addedLinks = [];
 				for(var linkId in updatedLinksById){
 					var link = updatedLinksById[linkId];
 					addedLinks.push(link);
 				};
 				if( addedLinks.length > 0 ){
 					this._addLinksToInactiveList(addedLinks);
 					elementsAdded.push.apply(elementsAdded, addedLinks);
 					updatedRequired = true;
 				};
 			};
 		};

 		if( opts.removed ){
 			for(var i=0,e=opts.removed.length; i<e; ++i){
 				var doc = opts.removed[i];

 				var node = this.nodesById[doc._id];
 				if( node ){
 					elementsRemoved.push(node);
 					delete this.nodesById[doc._id];
 					updatedRequired = true;
 				};

 				var linkArray = this.activeLinkArrayById[doc._id];
 				if( linkArray ){
 					elementsRemoved.push.apply(elementsRemoved, linkArray);
 					delete this.activeLinkArrayById[doc._id];
 					updatedRequired = true;
 				};

 				linkArray = this.inactiveLinkArrayById[doc._id];
 				if( linkArray ){
 					elementsRemoved.push.apply(elementsRemoved, linkArray);
 					delete this.inactiveLinkArrayById[doc._id];
 				};
 			};
 		};

 		// Find links going inactive
 		var linksGoingInactive = [];
 		for(var docId in this.activeLinkArrayById){
 			var activeLinkArray = this.activeLinkArrayById[docId];
 			for(var i=0,e=activeLinkArray.length; i<e; ++i){
 				var activeLink = activeLinkArray[i];

 				var sourceDocId = activeLink.getSourceDocId();
 				var targetDocId = activeLink.getTargetDocId();

 				var inactive = false;
 				if( !this.nodesById[sourceDocId] ){
 					inactive = true;
 				} else if( !this.nodesById[targetDocId] ){
 					inactive = true;
 				};
 				
 				if( inactive ){
 					linksGoingInactive.push(activeLink);
 				};
 			};
 		};

 		// Find links going active
 		var linksGoingActive = [];
 		for(var docId in this.inactiveLinkArrayById){
 			var inactiveLinkArray = this.inactiveLinkArrayById[docId];
 			for(var i=0,e=inactiveLinkArray.length; i<e; ++i){
 				var inactiveLink = inactiveLinkArray[i];

 				var sourceDocId = inactiveLink.getSourceDocId();
 				var targetDocId = inactiveLink.getTargetDocId();

 				var source = this.nodesById[sourceDocId];
 				var target = this.nodesById[targetDocId];

 				var active = true;
 				if( !source ){
 					active = false;
 				} else if( !target ){
 					active = false;
 				};
 				
 				if( active ){
 					inactiveLink.source = source;
 					inactiveLink.target = target;
 					linksGoingActive.push(inactiveLink);
 				};
 			};
 		};
 		
 		// Move links
 		if( linksGoingInactive.length > 0 ){
 			this._removeLinksFromActiveList(linksGoingInactive);
 			this._addLinksToInactiveList(linksGoingInactive);
 			updatedRequired = true;
 		};
 		if( linksGoingActive.length > 0 ){
 			this._removeLinksFromInactiveList(linksGoingActive);
 			this._addLinksToActiveList(linksGoingActive);
 			updatedRequired = true;
 		};
 		
 		// Update nodes monitored by intent view
 		this.intentView.removeNodes(elementsRemoved);
 		this.intentView.addNodes(elementsAdded);
 		
 		if( updatedRequired ){
 			this._documentsUpdated(nodesUpdated, linksUpdated);
 		};
 	},
 	
 	_intentViewUpdated: function(changedNodes){
 		// Segregate nodes and active links
 		var nodes = [];
 		var activeLinks = [];
 		var restart = false;
 		for(var i=0,e=changedNodes.length; i<e; ++i){
 			var changedNode = changedNodes[i];
 			
 			// $n2.log(changedNode.n2_id+' sel:'+changedNode.n2_selected+' foc:'+changedNode.n2_hovered+' find:'+changedNode.n2_found);
 			
 			if( changedNode.isNode ){
 				nodes.push(changedNode);
 				
 				if( changedNode.n2_found 
 				 && !changedNode.forceFound ){
 					restart = true;
 					changedNode.forceFound = true;

 				} else if( !changedNode.n2_found 
 				 && changedNode.forceFound ){
 					changedNode.forceFound = false;
 				};
 				
 			} else if( changedNode.isLink 
 			 && this.activeLinkArrayById[changedNode.n2_id] ){
 				activeLinks.push(changedNode);
 			};
 		};

 		// Update style on nodes
 		var selectedNodes = this._getSvgElem().select('g.nodes').selectAll('.node')
 			.data(nodes, function(node){ return node.n2_id; });
 		this._adjustElementStyles(selectedNodes);

 		// Update style on links
 		var selectedLinks = this._getSvgElem().select('g.links').selectAll('.link')
 			.data(activeLinks, function(link){ return link.linkId; });
 		this._adjustElementStyles(selectedLinks);
 		
 		if( restart ){
 			this.forceLayout.start();
 		};
 	},
 	
 	_createNodeFromDocument: function(doc){
		return new Node(doc);
 	},
 	
 	_createLinksFromDocument: function(doc){
 		var links = [];
 		
 		// Create links for references
 		var refDocIds = {};
 		var references = [];
 		$n2.couchUtils.extractLinks(doc, references);
 		for(var i=0,e=references.length; i<e; ++i){
 			var ref = references[i];
 			if( ref.doc ){
 				refDocIds[ref.doc] = true;
 			};
 		};
 		for(var refDocId in refDocIds){
 			var link = new Link(doc, doc._id, refDocId);
 			links.push(link);
 		};
 		
 		return links;
 	},
 	
 	_getLinksFromDocId: function(docId){
 		var result = [];
 		
 		var activeLinkArray = this.activeLinkArrayById[docId];
 		if( activeLinkArray ){
 			result.push.apply(result, activeLinkArray);
 		};

 		var inactiveLinkArray = this.inactiveLinkArrayById[docId];
 		if( inactiveLinkArray ){
 			result.push.apply(result, inactiveLinkArray);
 		};
 		
 		return result;
 	},
 	
 	_removeLink: function(link){
 		var docId = link.n2_id;
 		
 		var activeLinkArray = this.activeLinkArrayById[docId];
 		if( activeLinkArray ){
 			var index = activeLinkArray.indexOf(link);
 			if( index >= 0 ){
 				if( activeLinkArray.length < 2 ){
 					delete this.activeLinkArrayById[docId];
 				} else {
 					activeLinkArray.splice(index,1);
 				};
 			};
 		};

 		var inactiveLinkArray = this.inactiveLinkArrayById[docId];
 		if( inactiveLinkArray ){
 			var index = inactiveLinkArray.indexOf(link);
 			if( index >= 0 ){
 				if( inactiveLinkArray.length < 2 ){
 					delete this.inactiveLinkArrayById[docId];
 				} else {
 					inactiveLinkArray.splice(index,1);
 				};
 			};
 		};
 	},
 	
 	_addLinksToActiveList: function(links){
 		for(var i=0,e=links.length; i<e; ++i){
 			var link = links[i];
 			var docId = link.n2_id;
 			var activeLinkArray = this.activeLinkArrayById[docId];
 			if( !activeLinkArray ){
 				activeLinkArray = [];
 				this.activeLinkArrayById[docId] = activeLinkArray;
 			};
 			var index = activeLinkArray.indexOf(link);
 			if( index < 0 ){
 				activeLinkArray.push(link);
 			};
 		};
 	},
 	
 	_removeLinksFromActiveList: function(links){
 		for(var i=0,e=links.length; i<e; ++i){
 			var link = links[i];
 			var docId = link.n2_id;
 			var activeLinkArray = this.activeLinkArrayById[docId];
 			var index = activeLinkArray.indexOf(link);
 			if( index >= 0 ){
 				if( activeLinkArray.length < 2 ){
 					delete this.activeLinkArrayById[docId];
 				} else {
 					activeLinkArray.splice(index,1);
 				};
 			};
 		};
 	},
 	
 	_addLinksToInactiveList: function(links){
 		for(var i=0,e=links.length; i<e; ++i){
 			var link = links[i];
 			var docId = link.n2_id;
 			var inactiveLinkArray = this.inactiveLinkArrayById[docId];
 			if( !inactiveLinkArray ){
 				inactiveLinkArray = [];
 				this.inactiveLinkArrayById[docId] = inactiveLinkArray;
 			};
 			var index = inactiveLinkArray.indexOf(link);
 			if( index < 0 ){
 				inactiveLinkArray.push(link);
 			};
 		};
 	},
 	
 	_removeLinksFromInactiveList: function(links){
 		for(var i=0,e=links.length; i<e; ++i){
 			var link = links[i];
 			var docId = link.n2_id;
 			var inactiveLinkArray = this.inactiveLinkArrayById[docId];
 			var index = inactiveLinkArray.indexOf(link);
 			if( index >= 0 ){
 				if( inactiveLinkArray.length < 2 ){
 					delete this.inactiveLinkArrayById[docId];
 				} else {
 					inactiveLinkArray.splice(index,1);
 				};
 			};
 		};
 	},
 	
 	_initiateMouseClick: function(doc){
 		var docId = doc._id;
 		if( this.toggleSelection 
 		 && this.lastDocIdSelected === docId ){
 			this._dispatch({
 				type: 'userUnselect'
 			});
 		} else {
 			this._dispatch({
 				type: 'userSelect'
 				,docId: doc._id
 				,doc: doc
 			});
 		};
 	},
 	
 	_initiateMouseOver: function(doc){
 		var docId = doc._id;
 		if( docId !== this.currentMouseOver ){
 			// Focus Off before Focus On
 			if( this.currentMouseOver ){
 				this._dispatch({
 					type: 'userFocusOff'
 					,docId: this.currentMouseOver
 				});
 				
 				this.currentMouseOver = null;
 			};
 			
 			this._dispatch({
 				type: 'userFocusOn'
 				,docId: docId
 				,doc: doc
 			});
 			this.currentMouseOver = docId;
 		};
 	},
 	
 	_initiateMouseOut: function(doc){
 		var docId = doc._id;
 		if( docId === this.currentMouseOver ){
 			this._dispatch({
 				type: 'userFocusOff'
 				,docId: this.currentMouseOver
 				,doc: doc
 			});
 			
 			this.currentMouseOver = null;
 		};
 	},
 	
 	_handleDispatch: function(m){
 		if( 'selected' === m.type ){
 			this.lastDocIdSelected = m.docId;
 			
 		} else if( 'unselected' === m.type ){
 			this.lastDocIdSelected = null;
 			
 		} else if( 'modelGetInfo' === m.type ){
 			if( m.modelId === this.modelId ){
 				m.modelInfo = this._getModelInfo();
 			};
 			
 		} else if( 'modelStateUpdated' === m.type ) {
 			if( this.sourceModelId === m.modelId ){
 				if( m.state ){
 					this._dbPerspectiveUpdated(m.state)
 				};
 			};
 		};
 	},
 	
 	_getModelInfo: function(){
 		var info = {
 			modelId: this.modelId
 			,modelType: 'obi_force_graph'
 			,parameters: []
 		};
 		
 		info.parameters.push( this.stickyParameter.getInfo() );
 		
 		return info;
 	},
 	
 	_updateParameter: function(paramName, paramValue){
 		if( 'sticky' === paramName ){
 			if( !paramValue ){
 				var restart = false;
 				for(var docId in this.nodesById){
 					var node = this.nodesById[docId];
 					if( node.fixed ){
 						node.fixed = false;
 						restart = true;
 					};
 				};

 				if( restart ){
 					this.forceLayout.start();
 				};
 			};
 		};
 	}
 });
 
//--------------------------------------------------------------------------
function HandleCanvasAvailableRequest(m){
	if( m.canvasType === 'forceGraph' ){
		m.isAvailable = true;
	};
};

//--------------------------------------------------------------------------
function HandleCanvasDisplayRequest(m){
	if( m.canvasType === 'forceGraph' ){
		
		var options = {};
		if( m.canvasOptions ){
			for(var key in m.canvasOptions){
				options[key] = m.canvasOptions[key];
			};
		};
		
		options.canvasId = m.canvasId;
		options.interactionId = m.interactionId;
		options.config = m.config;
		options.moduleDisplay = m.moduleDisplay;
		options.onSuccess = m.onSuccess;
		options.onError = m.onError;
		
		new ForceGraph(options);
	};
};

//--------------------------------------------------------------------------
$n2.forceGraph = {
	ForceGraph: ForceGraph
	,HandleCanvasAvailableRequest: HandleCanvasAvailableRequest
	,HandleCanvasDisplayRequest: HandleCanvasDisplayRequest
};

})(jQuery,nunaliit2,d3);
