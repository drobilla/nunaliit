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

;(function($,$n2) {
"use strict";

// Localization
var _loc = function(str,args){ return $n2.loc(str,'nunaliit2-couch',args); };
var DH = 'n2.couchDialogs';

//++++++++++++++++++++++++++++++++++++++++++++++
function searchForDocumentId(options_){

	var options = $n2.extend({
		searchServer: null
		,showService: null
		,onSelected: function(docId){}
		,onReset: function(){}
	},options_);
	
	var shouldReset = true;
	
	var dialogId = $n2.getUniqueId();
	var inputId = $n2.getUniqueId();
	var searchButtonId = $n2.getUniqueId();
	var displayId = $n2.getUniqueId();
	var $dialog = $('<div id="'+dialogId+'" class="editorSelectDocumentDialog">'
			+'<div><label for="'+inputId+'">'+_loc('Search:')+'</label>'
			+'<input id="'+inputId+'" type="text"/>'
			+'<button id="'+searchButtonId+'">'+_loc('Search')+'</button></div>'
			+'<div  class="editorSelectDocumentDialogResults" id="'+displayId+'"></div>'
			+'<div><button class="cancel">'+_loc('Cancel')+'</button></div>'
			+'</div>');
	
	$dialog.find('button.cancel')
			.button({icons:{primary:'ui-icon-cancel'}})
			.click(function(){
				var $dialog = $('#'+dialogId);
				$dialog.dialog('close');
				return false;
			})
		;
	
	var dialogOptions = {
		autoOpen: true
		,title: _loc('Select Document')
		,modal: true
		,width: 370
		,close: function(event, ui){
			var diag = $(event.target);
			diag.dialog('destroy');
			diag.remove();
			if( shouldReset ) {
				options.onReset();
			};
		}
	};
	$dialog.dialog(dialogOptions);

	options.searchServer.installSearch({
		textInput: $('#'+inputId)
		,searchButton: $('#'+searchButtonId)
		,displayFn: receiveSearchResults
		,onlyFinalResults: true
	});
	
	var $input = $('#'+inputId);
	$('#'+inputId).focus();
	
	function receiveSearchResults(displayData) {
		if( !displayData ) {
			reportError('Invalid search results returned');

		} else if( 'wait' === displayData.type ) {
			$('#'+displayId).empty();

		} else if( 'results' === displayData.type ) {
			var docIds = [];
			for(var i=0,e=displayData.list.length; i<e; ++i) {
				var docId = displayData.list[i].id;
				docIds.push(docId);
			};
			displayDocIds(docIds);
			
		} else {
			reportError('Invalid search results returned');
		};
	};
	
	function displayDocIds(docIds){
		if( docIds.length < 1 ){
			$('#'+displayId)
				.empty()
				.append( _loc('Search result is empty') );
			
		} else {
			var $table = $('<table></table>');
			$('#'+displayId).empty().append($table);
		
			for(var i=0,e=docIds.length; i<e; ++i) {
				var docId = docIds[i];
				
				var $tr = $('<tr>')
					.appendTo($table);

				var $td = $('<td>')
					.addClass('n2_search_result olkitSearchMod2_'+(i%2))
					.appendTo($tr);
				
				var $a = $('<a>')
					.attr('href','#'+docId)
					.attr('alt',docId)
					.appendTo($td)
					.click( createClickHandler(docId) );

				if( options.showService ) {
					options.showService.printBriefDescription($a,docId);
				} else {
					$a.text(docId);
				};
			};
		};
	};
	
	function createClickHandler(docId) {
		return function(e){
			options.onSelected(docId);
			shouldReset = false;
			var $dialog = $('#'+dialogId);
			$dialog.dialog('close');
			return false;
		};
	};
};

//++++++++++++++++++++++++++++++++++++++++++++++
function selectLayersDialog(opts_){
	
	var opts = $n2.extend({
		currentLayers: []
		,cb: function(selectedLayerIds){}
		,resetFn: function(){}
		,documentSource: null
		,showService: null
		,dispatchService: null
	},opts_);
	
	var layers = {};
	if( typeof(opts.currentLayers) === 'string' ){
		var layerNames = opts.currentLayers.split(',');
		for(var i=0,e=layerNames.length;i<e;++i){
			var layerId = $n2.trim(layerNames[i]);
			layers[layerId] = {
				currentlySelected: true
				,id: layerId
				,label: null
			};
		};
		
	} else if( $n2.isArray(opts.currentLayers) ){
		for(var i=0,e=opts.currentLayers.length;i<e;++i){
			var layerId = $n2.trim(opts.currentLayers[i]);
			layers[layerId] = {
				currentlySelected: true
				,id: layerId
				,label: null
			};
		};
	};

	var shouldReset = true;
	var dialogId = $n2.getUniqueId();
	var $dialog = $('<div id="'+dialogId+'" class="editorSelectLayerDialog">'
			+'<div class="editorSelectLayerContent"></div>'
			+'<div class="editorSelectLayerButtons"><button class="ok">'+_loc('OK')+'</button>'
			+'<button class="cancel">'+_loc('Cancel')+'</button></div>'
			+'</div>');
	
	$dialog.find('button.cancel')
		.button({icons:{primary:'ui-icon-cancel'}})
		.click(function(){
			var $dialog = $('#'+dialogId);
			$dialog.dialog('close');
			return false;
		});
	$dialog.find('button.ok')
		.button({
			icons:{primary:'ui-icon-check'}
			,disabled: true
		});
	
	var dialogOptions = {
		autoOpen: true
		,title: _loc('Select Layers')
		,modal: true
		,width: 370
		,close: function(event, ui){
			var diag = $(event.target);
			diag.dialog('destroy');
			diag.remove();
			if( shouldReset ) {
				opts.resetFn();
			};
		}
	};
	$dialog.dialog(dialogOptions);
	
	// Get layers
	if( opts.documentSource ){
		opts.documentSource.getLayerDefinitions({
			onSuccess: function(layerDefs){
				for(var i=0,e=layerDefs.length;i<e;++i){
					var layerDef = layerDefs[i];
					var layerId = layerDef.id;
					if( !layers[layerId] ){
						layers[layerId] = {
							currentlySelected: false
						};
					};
					if( layerDef.name ){
						layers[layerId].label = layerDef.name;
					};
				};
				getInnerLayers();
			}
			,onError: function(errorMsg){ 
				reportError(errorMsg);
			}
		});
	} else {
		getInnerLayers();
	};
	
	function getInnerLayers(){
		var m = {
			type: 'mapGetLayers'
			,layers: {}
		};
		opts.dispatchService.synchronousCall(DH, m);
		for(var layerId in m.layers){
			if( !layers[layerId] ){
				layers[layerId] = {
					currentlySelected: false	
				};
			};
		};
		displayLayers();
	};
	
	function displayLayers(){
		var $diag = $('#'+dialogId);
		
		var $c = $diag.find('.editorSelectLayerContent');
		$c.empty();
		for(var layerId in layers){
			var label = layerId;
			if( layers[layerId].label ){
				label = _loc( layers[layerId].label );
			};
			
			var inputId = $n2.getUniqueId();
			var $div = $('<div>')
				.appendTo($c);
			var $input = $('<input type="checkbox">')
				.addClass('layer')
				.attr('id',inputId)
				.attr('name',layerId)
				.appendTo($div);
			var $label = $('<label>')
				.attr('for',inputId)
				.text(label)
				.appendTo($div);

			if( layers[layerId].currentlySelected ){
				$input.attr('checked','checked');
			};
			
			if( opts.showService && !layers[layerId].label ){
				opts.showService.printLayerName($label, layerId);
			};
		};
		
		$diag.find('button.ok')
			.button('option','disabled',false)
			.click(function(){
				var selectedLayers = [];
				var $diag = $('#'+dialogId);
				$diag.find('input.layer').each(function(){
					var $input = $(this);
					if( $input.is(':checked') ){
						var layerId = $input.attr('name');
						selectedLayers.push(layerId);
					};
				});
				opts.cb(selectedLayers);

				shouldReset = false;
				$diag.dialog('close');
			});
	};
	
	function reportError(err){
		$('#'+dialogId).find('.editorSelectLayerContent').text('Error: '+err);
	};
};

//++++++++++++++++++++++++++++++++++++++++++++++
// This is a factory class to generate a dialog function that
// can be used in selecting a document id from a list of presented
// documents. This is an abstract class and it must be specialized
// before it can be useful. Each sub-class should implement the
// method getDocuments() to return a sorted list of documents that
// can be selected.
//
// The dialog presented offers a search box which narrows the list
// of presented documents, based on the displayed brief.
var SearchBriefDialogFactory = $n2.Class({

	showService: null,
	
	dialogPrompt: null,
	
	initialize: function(opts_){
		var opts = $n2.extend({
			showService: null
			,dialogPrompt: _loc('Select')
		},opts_);
		
		this.showService = opts.showService;
		this.dialogPrompt = opts.dialogPrompt;
	},
	
	/*
	 * This method returns a function that can be used in
	 * DialogService.addFunctionToMap
	 */
	getDialogFunction: function(){
		var _this = this;
		return function(opts){
			_this.showDialog(opts);
		};
	},
	
	/*
	 * This method must be implemented by sub-classes
	 */
	getDocuments: function(opts_){
		var opts = $n2.extend({
			onSuccess: function(docs){}
			,onError: function(err){}
		},opts_);
		
		$n2.log('Subclasses to SearchBriefDialogFactory must implement getDocuments()');
		
		opts.onSuccess([]);
	},
	
	showDialog: function(opts_){
		var opts = $n2.extend({
			onSelected: function(docId){}
			,onReset: function(){}
		},opts_);
		
		var _this = this;

		var shouldReset = true;
		
		var dialogId = $n2.getUniqueId();
		var inputId = $n2.getUniqueId();
		var displayId = $n2.getUniqueId();
		var $dialog = $('<div>')
			.attr('id',dialogId)
			.addClass('editorSelectDocumentDialog')
			;
		
		var $searchLine = $('<div>')
			.appendTo($dialog);
		
		$('<label>')
			.attr('for', inputId)
			.text( _loc('Search:') )
			.appendTo($searchLine);
		
		$('<input>')
			.attr('id', inputId)
			.attr('type', 'text')
			.appendTo($searchLine)
			.keyup(function(){
				var $input = $(this);
				var text = $input.val();
				var frags = text.split(' ');
				var words = [];
				for(var i=0,e=frags.length; i<e; ++i){
					var frag = $n2.trim( frags[i].toLowerCase() );
					if( frag.length > 0 ){
						words.push(frag);
					};
				};
				$n2.log('text : '+words.join('+'));
				filterList(words);
			});
		
		var $results = $('<div>')
			.attr('id',displayId)
			.addClass('editorSelectDocumentDialogResults')
			.appendTo($dialog);

		$('<div>')
			.addClass('olkit_wait')
			.appendTo($results);

		var $buttons = $('<div>')
			.appendTo($dialog);
		
		$('<button>')
			.addClass('cancel')
			.text( _loc('Cancel') )
			.appendTo($buttons)
			.button({icons:{primary:'ui-icon-cancel'}})
			.click(function(){
				var $dialog = $('#'+dialogId);
				$dialog.dialog('close');
				return false;
			});
		
		var dialogOptions = {
			autoOpen: true
			,title: this.dialogPrompt
			,modal: true
			,width: 370
			,close: function(event, ui){
				var diag = $(event.target);
				diag.dialog('destroy');
				diag.remove();
				if( shouldReset ) {
					opts.onReset();
				};
			}
		};
		$dialog.dialog(dialogOptions);

		this.getDocuments({
			onSuccess: displayDocs
			,onError: function(errorMsg){ 
				reportError( _loc('Unable to retrieve documents: {err}',{
					err: errorMsg
				}) ); 
			}
		});

		function displayDocs(docs) {

			if( docs.length < 1 ){
				$('#'+displayId)
					.empty()
					.text( _loc('No document found') );
				
			} else {
				var $table = $('<table></table>');
				$('#'+displayId).empty().append($table);

				for(var i=0,e=docs.length; i<e; ++i) {
					var doc = docs[i];
					var docId = doc._id;
					
					var $tr = $('<tr>')
						.addClass('trResult')
						.appendTo($table);

					var $td = $('<td>')
						.addClass('n2_search_result olkitSearchMod2_'+(i%2))
						.appendTo($tr);
					
					var $a = $('<a>')
						.attr('href','#'+docId)
						.attr('alt',docId)
						.appendTo($td)
						.click( createClickHandler(docId) );
					
					if( _this.showService ) {
						_this.showService.displayBriefDescription($a, {}, doc);
					} else {
						$a.text(docId);
					};
				};
			};
		};
		
		function filterList(words){
			var $dialog = $('#'+dialogId);
			var $trs = $dialog.find('.trResult');
			if( !words || words.length < 1 ){
				$trs.show();
			} else {
				$trs.each(function(){
					var $tr = $(this);
					var trText = $tr.text().toLowerCase();
					//$n2.log('trText : '+trText);
					var show = true;
					for(var i=0,e=words.length; i<e && show; ++i){
						var word = words[i];
						if( trText.indexOf(word) < 0 ){
							show = false;
						};
					};
					
					if( show ){
						$tr.show();
					} else {
						$tr.hide();
					};
				});
			};
		};
		
		function createClickHandler(docId) {
			return function(e){
				opts.onSelected(docId);
				shouldReset = false;
				var $dialog = $('#'+dialogId);
				$dialog.dialog('close');
				return false;
			};
		};
		
		function reportError(err){
			$('#'+displayId)
				.empty()
				.text( err );
		};
	}

});

//++++++++++++++++++++++++++++++++++++++++++++++
// This is a factory class to generate a dialog function that
// can be used in selecting a document id from a list of presented
// documents. This is an abstract class and it must be specialized
// before it can be useful. Each sub-class should implement the
// method filterDocuments() to return a sorted list of documents that
// can be selected.
//
// The dialog presented offers a search box which performs a text
// search through the database. The documents retrieved this way
// are filtered and sorted by the sub-class. Then filtered list is
// presented to the user for selection.
var FilteredSearchDialogFactory = $n2.Class({

	atlasDb: null,
	
	searchService: null,
	
	showService: null,
	
	dialogPrompt: null,
	
	initialize: function(opts_){
		var opts = $n2.extend({
			atlasDb: null
			,searchService: null
			,showService: null
			,dialogPrompt: _loc('Search')
		},opts_);
		
		this.atlasDb = opts.atlasDb;
		this.searchService = opts.searchService;
		this.showService = opts.showService;
		this.dialogPrompt = opts.dialogPrompt;
	},
	
	/*
	 * This method returns a function that can be used in
	 * DialogService.addFunctionToMap
	 */
	getDialogFunction: function(){
		var _this = this;
		return function(opts){
			_this.showDialog(opts);
		};
	},
	
	/*
	 * This method must be implemented by sub-classes
	 */
	filterDocuments: function(opts_){
		var opts = $n2.extend({
			docs: null
			,onSuccess: function(docs){}
			,onError: function(err){}
		},opts_);
		
		$n2.log('Subclasses to FilteredSearchDialogFactory must implement filterDocuments()');
		
		opts.onSuccess( opts.docs );
	},
	
	showDialog: function(opts_){
		var opts = $n2.extend({
			onSelected: function(docId){}
			,onReset: function(){}
		},opts_);
		
		var _this = this;

		var shouldReset = true;
		
		var dialogId = $n2.getUniqueId();
		var inputId = $n2.getUniqueId();
		var searchButtonId = $n2.getUniqueId();
		var displayId = $n2.getUniqueId();
		
		var $dialog = $('<div id="'+dialogId+'" class="editorSelectDocumentDialog">')
			.attr('id',dialogId)
			.addClass('editorSelectDocumentDialog');
		
		var $searchLine = $('<div>')
			.appendTo($dialog);

		$('<label>')
			.attr('for', inputId)
			.text( _loc('Search:') )
			.appendTo($searchLine);

		$('<input>')
			.attr('id', inputId)
			.attr('type', 'text')
			.appendTo($searchLine);

		$('<button>')
			.attr('id', searchButtonId)
			.text( _loc('Search') )
			.appendTo($searchLine);
		
		$('<div>')
			.attr('id',displayId)
			.addClass('editorSelectDocumentDialogResults')
			.appendTo($dialog);
		
		var $buttons = $('<div>')
			.appendTo($dialog);
		
		$('<button>')
			.addClass('cancel')
			.text( _loc('Cancel') )
			.appendTo($buttons)
			.button({icons:{primary:'ui-icon-cancel'}})
			.click(function(){
				var $dialog = $('#'+dialogId);
				$dialog.dialog('close');
				return false;
			});

		var dialogOptions = {
			autoOpen: true
			,title: this.dialogPrompt
			,modal: true
			,width: 370
			,close: function(event, ui){
				var diag = $(event.target);
				diag.dialog('destroy');
				diag.remove();
				if( shouldReset ) {
					opts.onReset();
				};
			}
		};
		$dialog.dialog(dialogOptions);

		this.searchService.installSearch({
			textInput: $('#'+inputId)
			,searchButton: $('#'+searchButtonId)
			,displayFn: receiveSearchResults
			,onlyFinalResults: true
		});
		
		var $input = $('#'+inputId);
		$('#'+inputId).focus();
		
		function receiveSearchResults(displayData) {
			if( !displayData ) {
				reportError( _loc('Invalid search results returned') );

			} else if( 'wait' === displayData.type ) {
				$('#'+displayId).empty();

			} else if( 'results' === displayData.type ) {
				var docIds = [];
			
				for(var i=0,e=displayData.list.length; i<e; ++i) {
					var docId = displayData.list[i].id;
					docIds.push(docId);
				};
				
				if( docIds.length < 1 ){
					displayDocs([]);
					
				} else {
					_this.atlasDb.getDocuments({
						docIds: docIds
						,onSuccess: function(docs){

							_this.filterDocuments({
								docs: docs
								,onSuccess: displayDocs
								,onError: reportError
							});
						}
						,onError: function(errorMsg){ 
							reportError( _loc('Unable to retrieve documents') );
						}
					});
				};
				
			} else {
				reportError( _loc('Invalid search results returned') );
			};
		};

		function displayDocs(docs) {

			if( docs.length < 1 ){
				$('#'+displayId)
					.empty()
					.text( _loc('No results returned by search') );
				
			} else {
				var $table = $('<table></table>');
				$('#'+displayId).empty().append($table);

				for(var i=0,e=docs.length; i<e; ++i) {
					var doc = docs[i];
					var docId = doc._id;
					
					var $tr = $('<tr></tr>');

					$table.append($tr);

					var $td = $('<td>')
						.addClass('n2_search_result olkitSearchMod2_'+(i%2))
						.appendTo($tr);
					
					var $a = $('<a>')
						.attr('href','#'+docId)
						.attr('alt',docId)
						.appendTo($td)
						.click( createClickHandler(docId) );
					
					if( _this.showService ) {
						_this.showService.displayBriefDescription($a, {}, doc);
					} else {
						$a.text(docId);
					};
				};
			};
		};
		
		function createClickHandler(docId) {
			return function(e){
				opts.onSelected(docId);
				shouldReset = false;
				var $dialog = $('#'+dialogId);
				$dialog.dialog('close');
				return false;
			};
		};
		
		function reportError(err){
			$('#'+displayId)
				.empty()
				.text( err );
		};
	}
});

//++++++++++++++++++++++++++++++++++++++++++++++
var DialogService = $n2.Class({

	dispatchService: null,
	
	documentSource: null,

	searchService: null,
	
	showService: null,
	
	schemaRepository: null,
	
	funcMap: null,
	
	initialize: function(opts_) {
		var opts = $n2.extend({
			dispatchService: null
			,documentSource: null
			,searchService: null
			,showService: null
			,schemaRepository: null
			,funcMap: null
		},opts_);
	
		var _this = this;
		
		this.dispatchService = opts.dispatchService;
		this.documentSource = opts.documentSource;
		this.searchService = opts.searchService;
		this.showService = opts.showService;
		this.schemaRepository = opts.schemaRepository;
		
		this.funcMap = {};
		for(var key in opts.funcMap){
			var fn = opts.funcMap[key];
			
			if( typeof(fn) === 'function' ){
				this.funcMap[key] = fn;
			};
		};
		
		// Add 'getDocumentId', if not defined
		if( !this.funcMap['getDocumentId'] ){
			this.funcMap['getDocumentId'] = function(opts){
				_this.searchForDocumentId(opts);
			};			
		};
		if( !this.funcMap['getLayers'] ){
			this.funcMap['getLayers'] = function(opts){
				_this.selectLayersDialog(opts);
			};			
		};
	},
	
	getFunctionMap: function(){
		return this.funcMap;
	},
	
	addFunctionToMap: function(fnName, fn){
		if( typeof(fn) === 'function' ){
			this.funcMap[fnName] = fn;
		};
	},

	searchForDocumentId: function(opts_){
		var opts = $n2.extend({
			onSelected: function(docId){}
			,onReset: function(){}
		},opts_);
		
		
		var searchServer = this.searchService;
		var showService = this.showService;
		
		searchForDocumentId({
			searchServer: searchServer
			,showService: showService
			,onSelected: opts.onSelected
			,onReset: opts.onReset
		});
	},
	
	selectLayersDialog: function(opts_){
		var opts = $n2.extend({
			currentLayers: []
			,onSelected: function(layerIds){}
			,onReset: function(){}
		},opts_);

		selectLayersDialog({
			currentLayers: opts.currentLayers
			,cb: opts.onSelected
			,resetFn: opts.onReset
			,showService: this.showService
			,dispatchService: this.dispatchService
			,documentSource: this.documentSource
		});
	},

	selectSchemaFromNames: function(opt_){
		var opt = $n2.extend({
			schemaNames: []
			,onSelected: function(schema){}
			,onError: $n2.reportErrorForced
			,onReset: function(){}
		},opt_);
		
		var _this = this;
		
		this.schemaRepository.getSchemas({
			names: opt.schemaNames
			,onSuccess: function(schemas){
				_this.selectSchema({
					schemas: schemas
					,onSelected: opt.onSelected
					,onError: opt.onError
					,onReset: opt.onReset
				});
			}
			,onError: opt.onError
		});
	},
	
	selectSchema: function(opt_){
		var opt = $n2.extend({
			schemas: null
			,onSelected: function(schema){}
			,onError: $n2.reportErrorForced
			,onReset: function(){}
		},opt_);
		
		var _this = this;
		
		// Check if all schemas
		if( null === opt.schemas ){
			this.schemaRepository.getRootSchemas({
				names: opt.schemaNames
				,onSuccess: function(schemas){
					_this.selectSchema({
						schemas: schemas
						,onSelected: opt.onSelected
						,onError: opt.onError
						,onReset: opt.onReset
					});
				}
				,onError: opt.onError
			});
			return;
		};
		
		if( !opt.schemas.length ) {
			opt.onReset();
			return;
		}

		if( opt.schemas.length == 1 ) {
			opt.onSelected( opt.schemas[0] );
			return;
		}
		
		var diagId = $n2.getUniqueId();
		var $dialog = $('<div id="'+diagId+'"></div>');

		var $label = $('<span></span>');
		$label.text( _loc('Select schema') + ': ' );
		$dialog.append($label);
		
		var $select = $('<select></select>');
		$dialog.append($select);
		for(var i=0,e=opt.schemas.length; i<e; ++i){
			var schema = opt.schemas[i];
			var schemaName = schema.name;
			var schemaLabel = schema.getLabel();
			$('<option>')
				.text(schemaLabel)
				.val(schemaName)
				.appendTo($select);
		};

		$dialog.append( $('<br/>') );
		
		var $ok = $('<button></button>');
		$ok.text( _loc('OK') );
		$ok.button({icons:{primary:'ui-icon-check'}});
		$dialog.append( $ok );
		$ok.click(function(){
			var $diag = $('#'+diagId);
			var schemaName = $diag.find('select').val();
			$diag.dialog('close');
			_this.schemaRepository.getSchema({
				name: schemaName
				,onSuccess: opt.onSelected
				,onError: function(err){
					opt.onError( _loc('Unable to fetch schema') );
				}
			});
			return false;
		});
		
		var $cancel = $('<button></button>');
		$cancel.text( _loc('Cancel') );
		$cancel.button({icons:{primary:'ui-icon-cancel'}});
		$dialog.append( $cancel );
		$cancel.click(function(){
			$('#'+diagId).dialog('close');
			opt.onReset();
			return false;
		});
		
		var dialogOptions = {
			autoOpen: true
			,title: _loc('Select a schema')
			,modal: true
			,width: 740
			,close: function(event, ui){
				var diag = $(event.target);
				diag.dialog('destroy');
				diag.remove();
			}
		};
		$dialog.dialog(dialogOptions);
	}
});

//++++++++++++++++++++++++++++++++++++++++++++++

$n2.couchDialogs = {
	DialogService: DialogService
	,SearchBriefDialogFactory: SearchBriefDialogFactory
	,FilteredSearchDialogFactory: FilteredSearchDialogFactory
};

})(jQuery,nunaliit2);
