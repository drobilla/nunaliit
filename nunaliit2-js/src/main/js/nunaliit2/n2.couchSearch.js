/*
Copyright (c) 2010, Geomatics and Cartographic Research Centre, Carleton 
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

;(function($,$n2){
"use strict";

// Localization
var _loc = function(str,args){ return $n2.loc(str,'nunaliit2-couch',args); };

// Dispatcher
var DH = 'n2.couchSearch';

function SplitSearchTerms(line) {
	if( !line ) return null;
	
	var map = $n2.couchUtils.extractSearchTerms(line, false);

	var searchTerms = [];
	for(var term in map){
		var folded = map[term].folded;
		if( folded ) {
			searchTerms.push(folded);
		};
	};
	
	return searchTerms;
};

//============ SearchRequest ========================

var SearchRequest = $n2.Class({
	
	options: null
	
	,searchResults: null
	
	,initialize: function(searchTermsLine, opts_) {
		this.options = $n2.extend({
			designDoc: null
			,db: null
			,constraint: null
			,dateService: null
			,searchLimit: 25
			,onlyFinalResults: false
			,strict: false
			,onSuccess: function(searchResults){}
			,onError: function(err){ $n2.reportErrorForced(err); }
		},opts_);
		
		var searchTerms = searchTermsLine;
		if( typeof(searchTermsLine) === 'string' ) {
			searchTerms = SplitSearchTerms(searchTerms);
		} else if( $n2.isArray(searchTermsLine) ){
			searchTermsLine = searchTerms.join(' ');
		} else {
			this.options.onError('Search terms must be a string or an array');
			return;
		};
		
		var dateIntervals = null;
		if( this.options.dateService ){
			var dateStrings = $n2.date.findAllDateStrings(searchTermsLine);
			if( dateStrings && dateStrings.length ){
				dateIntervals = [];
				for(var i=0,e=dateStrings.length; i<e; ++i){
					dateIntervals.push( dateStrings[i].interval );
				};
			};
		};

		// Initialize results
		this.searchResults = {
			terms: []
			,actionReturnedCount: 0
			,pending: searchTerms.length
			,map: {}
			,sorted: []
			,list: []
		};
		if( dateIntervals ){
			this.searchResults.pending += dateIntervals.length;
		};
		
		// Handle case where nothing is asked
		if( !searchTerms.length ) {
			this._returnSearchResults();
			return;
		};
		
		// Search terms are stored lower case in database
		for(var i=0,e=searchTerms.length; i<e; ++i) {
			var t = searchTerms[i].toLowerCase();
			this.searchResults.terms.push(t);
		};
		
		// Figure out view
		var searchView = 'text-search';
		if( this.options.constraint ){
			searchView = 'text-search-constrained';
		};

		// Search for each term, and merge results later
		var _this = this;
		for(var i=0,e=this.searchResults.terms.length; i<e; ++i) {
			var term = this.searchResults.terms[i];
			
			var startKey = [term,0];
			var endKey = [term,{}];
			if( this.options.constraint ){
				startKey = [this.options.constraint,term,0];
				endKey = [this.options.constraint,term,{}];
			};
			
			this.options.designDoc.queryView({
				viewName: searchView
				,startkey: startKey
				,endkey: endKey
				,onSuccess: function(rows) {
					var termResults = [];
					for(var i=0,e=rows.length; i<e; ++i) {
						termResults.push({
							docId: rows[i].id
							,index: rows[i].key[1]
						});
					};
					_this._receiveSearchResults(termResults);
				}
				,onError: function(err) {
					_this.searchResults = null;
					_this.options.onError(err);
				}
			});
		};
		
		// Search each time interval
		if(dateIntervals){
			for(var i=0, e=dateIntervals.length; i<e; ++i){
				this.options.dateService.getDocIdsFromInterval({
					interval: dateIntervals[i]
					,onSuccess: function(docIds){
						var dateResults = [];
						for(var i=0,e=docIds.length; i<e; ++i) {
							dateResults.push({
								docId: docIds[i]
								,index: 0
							});
						};
						_this._receiveSearchResults(dateResults);
					}
					,onError: function(err){
						_this.searchResults = null;
						_this.options.onError(err);
					}
				});
			};
		};
	}

	,abortSearch: function() {
		this.searchResults = null;
	}
	
	,_receiveSearchResults: function(interimResults) {
	
		var searchResults = this.searchResults;
		
		if( !searchResults ) return;
		
		// Remember the returned response
		--searchResults.pending;
		++searchResults.actionReturnedCount;

		// Strict
		// In this mode, return only the results that meet
		// all the search terms. If not in strict mode,
		// it returns all result that meet any term.
		if( this.options.strict && searchResults.actionReturnedCount > 1 ) {
			// Add only the new results that match old ones
			var docIdsReturned = {};
			for(var i=0,e=interimResults.length; i<e; ++i) {
				var docId = interimResults[i].docId;
				var index = interimResults[i].index;
				
				docIdsReturned[docId] = true;
				
				if( searchResults.map[docId] ) {
					// Document already found, increment terms
					var m = searchResults.map[docId];
					++m.terms;
					if( m.index > index ) m.index = index;
				} else {
					// Do not add, it does not match a previous result
				};
			};

			// Remove previous results that are doc ids we have not received,
			// this time
			var docIdsToDelete = [];
			for(var docId in searchResults.map){
				if( !docIdsReturned[docId] ) {
					docIdsToDelete.push(docId);
				};
			};
			// Remove invalid search results
			for(var i=0,e=docIdsToDelete.length; i<e; ++i){
				delete searchResults.map[docIdsToDelete[i]];
			};
			// Rebuilt sorted list
			searchResults.sorted = [];
			for(var docId in searchResults.map){
				searchResults.sorted.push(searchResults.map[docId]);
			};

		} else {
			// This happens in non-strict mode or in the first
			// round of strict mode. Add all results to map.
			for(var i=0,e=interimResults.length; i<e; ++i) {
				var docId = interimResults[i].docId;
				var index = interimResults[i].index;
				
				if( searchResults.map[docId] ) {
					// Document already found, increment terms
					var m = searchResults.map[docId];
					++m.terms;
					if( m.index > index ) m.index = index;
				} else {
					var m = {
						id: docId
						,index: index
						,terms: 1
						,contentRequested: false
					};
					searchResults.map[docId] = m;
					searchResults.sorted.push(m);
				};
			};
		};
		
		this._returnSearchResults();
	}
	
	,_returnSearchResults: function() {
		
		var searchResults = this.searchResults;
		
		if( !searchResults ) return;

		var _this = this;
		
		if( this.options.onlyFinalResults ) {
			if( searchResults.pending > 0 ) {
				return;
			};
		};
		
		// Sort results
		searchResults.sorted.sort(function(a,b){
			if( a.terms > b.terms ) {
				return -1;
			} else if( a.terms < b.terms ) {
				return 1;
			} else {
				if( a.index < b.index ) {
					return -1;
				} else if( a.index > b.index ) {
					return 1;
				};
			};
			
			return 0;
		});
		
		// Create list that should be consumed by the client
		if( (searchResults.terms.length - searchResults.pending) <= 1 ) {
			// Only one term returned so far
			searchResults.list = searchResults.sorted;
		} else {
			// Copy only the results that match the most terms
			searchResults.list = [];
			if( searchResults.sorted.length > 0 ) {
				var termCount = searchResults.sorted[0].terms;
				for(var i=0,e=searchResults.sorted.length; i<e; ++i){
					var r = searchResults.sorted[i];
					if( r.terms >= termCount ) {
						searchResults.list.push(r);
					};
				};
			};
		};
		
		this.options.onSuccess(searchResults);
	}
});

//============ LookAheadService ========================

var LookAheadService = $n2.Class({

	designDoc: null,
	
	lookAheadLimit: null,
	
	lookAheadPrefixMin: null,
	
	lookAheadCacheSize: null,
	
	lookAheadMap: null,
	
	lookAheadCounter: null,
	
	constraint: null,
	
	initialize: function(opts_) {
		var opts = $n2.extend({
			designDoc: null
			,lookAheadLimit: 5
			,lookAheadPrefixMin: 3
			,lookAheadCacheSize: 10
			,constraint: null
		},opts_);
		
		this.designDoc = opts.designDoc;
		this.lookAheadLimit = opts.lookAheadLimit;
		this.lookAheadPrefixMin = opts.lookAheadPrefixMin;
		this.lookAheadCacheSize = opts.lookAheadCacheSize;
		this.constraint = opts.constraint;
		
		this.lookAheadMap = {};
		this.lookAheadCounter = 0;
	},
	
	setConstraint: function(constraint){
		this.constraint = constraint;
	},

	queryPrefix: function(prefix,callback) {
		var _this = this;
	
		var words = this._retrievePrefix(prefix);
		if( words ) {
			callback(prefix,words);
			return;
		};
		
		// Figure out query view
		var viewName = 'text-lookahead';
		if( this.constraint ){
			viewName = 'text-lookahead-constrained';
		};
		
		// Figure out start and end keys
		var startKey = [prefix,null];
		var endKey = [prefix + '\u9999',{}];
		if( this.constraint ){
			startKey = [this.constraint, prefix, null];
			endKey = [this.constraint, prefix + '\u9999', {}];
		};
		
		// Make request
		this.designDoc.queryView({
			viewName: viewName
			,listName: 'text-lookahead'
			,startkey: startKey
			,endkey: endKey
			,top: this.lookAheadLimit
			,group: true
			,onlyRows: false
			,reduce: true
			,onSuccess: function(response) {
				var rows = response.rows;
	
				var words = [];
				for(var i=0,e=rows.length; i<e; ++i) {
					words.push(rows[i][0]);
				};
				
				// Cache these results
				_this._cachePrefix({
					prefix: prefix
					,words: words
					,full: response.all_rows
				});
				
				if( 0 == words.length ) {
					callback(prefix,null);
				} else {
					callback(prefix,words);
				};
			}
			,onError: function(){
				callback(prefix,null);
			}
		});
	},
	
	queryTerms: function(terms,callback) {

		if( null === terms
		 || 0 == terms.length ) {
			callback(null);
			return;
		};
		
		var index = terms.length - 1;
		while( index >= 0 ) {
			var lastTerm = terms[index];
			if( '' === lastTerm ) {
				--index;
			} else {
				var previousWords = null;
				if( index > 0 ) {
					previousWords = terms.slice(0,index);
				};
				break;
			};
		};
		
		lastTerm = lastTerm.toLowerCase();
		
		if( !lastTerm ) {
			callback(null);
			return;
		};
		if( lastTerm.length < this.lookAheadPrefixMin ) {
			callback(null);
			return;
		};
		
		var previousWordsString = '';
		if( previousWords ) {
			previousWordsString = previousWords.join(' ') + ' ';
		};
		
		this.queryPrefix(lastTerm,function(prefix,words){
			
			if( null === words ) {
				callback(null);
			} else {
				var results = [];
				for(var i=0,e=words.length; i<e; ++i) {
					results.push( previousWordsString + words[i] );
				};
				callback(results);
			};
		});
	},
	
	_cachePrefix: function(prefixResult) {
		
		// Save result under prefix
		this.lookAheadMap[prefixResult.prefix] = prefixResult;
		
		// Mark generation
		prefixResult.counter = this.lookAheadCounter;
		++(this.lookAheadCounter);
		
		// Trim cache
		var keysToDelete = [];
		var cachedMap = this.lookAheadMap; // faster access
		var limit = this.lookAheadCounter - this.lookAheadCacheSize;
		for(var key in cachedMap) {
			if( cachedMap[key].counter < limit ) {
				keysToDelete.push(key);
			};
		};
		for(var i=0,e=keysToDelete.length; i<e; ++i) {
			delete cachedMap[keysToDelete[i]];
		};
	},
	
	_retrievePrefix: function(prefix) {
		
		// Do we have exact match in cache?
		if( this.lookAheadMap[prefix] ) {
			return this.lookAheadMap[prefix].words;
		};
		
		// Look for complete results from shorter prefix
		var sub = prefix.substring(0,prefix.length-1);
		while( sub.length >= this.lookAheadPrefixMin ) {
			if( this.lookAheadMap[sub] && this.lookAheadMap[sub].full ) {
				var cachedWords = this.lookAheadMap[sub].words;
				var words = [];
				for(var i=0,e=cachedWords.length; i<e; ++i) {
					var word = cachedWords[i];
					if( word.length >= prefix.length ) {
						if( word.substr(0,prefix.length) === prefix ) {
							words.push(word);
						};
					};
				};
				return words;
			};
			sub = sub.substring(0,sub.length-1);
		};
		
		// Nothing of value found
		return null;
	},

	getJqAutoCompleteSource: function() {
		var _this = this;
		return function(request, cb) {
			_this._jqAutoComplete(request, cb);
		};
	},
	
	_jqAutoComplete: function(request, cb) {
		var terms = SplitSearchTerms(request.term);
		var callback = cb;
//		var callback = function(res){
//			$n2.log('look ahead results',res);
//			cb(res);
//		}
		this.queryTerms(terms, callback);
	}

});

//============ SearchInput ========================

var SearchInput = $n2.Class({
	options: null
	
	,searchServer: null
	
	,textInputId: null
	
	,searchButtonId: null
	
	,keyPressedSinceLastSearch: null
	
	,dispatchHandle: null
	
	,initialize: function(opts_, server_){
		this.options = $n2.extend({
			textInput: null
			,searchButton: null
			,initialSearchText: null
			,constraint: null
			,displayFn: null // one of displayFn or
			,dispatchService: null // dispatchService should be supplied
		},opts_);
		
		var _this = this;
		
		this.searchServer = server_;

		this.keyPressedSinceLastSearch = false;
		
		if( this.options.dispatchService ) {
			var f = function(m){
				_this._handle(m);
			};
			this.options.dispatchService.register(DH,'searchInitiate',f);
			this.options.dispatchService.register(DH,'selected',f);
			this.options.dispatchService.register(DH,'unselected',f);
		};
		
		// Figure out id. We should not hold onto a reference
		// to the input since it would create a circular reference.
		// This way, if the element is removed from the window tree,
		// it all cleans up easy.
		var $textInput = this.options.textInput;
		this.textInputId = $n2.utils.getElementIdentifier($textInput);
		this.options.textInput = null; // get rid of reference

		// Same for button
		if( this.options.searchButton ) {
			var $searchButton = this.options.searchButton;
			var searchButtonId = $searchButton.attr('id');
			if( !searchButtonId ) {
				searchButtonId = $n2.getUniqueId();
				$searchButton.attr('id',searchButtonId);
			};
			this.searchButtonId = searchButtonId;
			this.options.searchButton = null; // get rid of reference
		};
		
		if( !this.options.initialSearchText ){
			this.options.initialSearchText = '';
		};
		
		this._install();
	}

	,getTextInput: function() {
		return $('#'+this.textInputId);
	}

	,getSearchButton: function() {
		if( this.searchButtonId ) {
			return $('#'+this.searchButtonId);
		};
		return null;
	}
	
	,getSearchLine: function(){
		var $textInput = this.getTextInput();
		var line = $textInput.val();
		if( line && line.length > 0 ) {
			if( line === this.options.initialSearchText ){
				return '';
			} else {
				return line;
			};
		} else {
			return '';
		};
	}
	
	,performSearch: function(line){
		
		var _this = this;

		if( this.options.dispatchService ) {
			this.options.dispatchService.send(DH, {
				type: 'searchInitiate'
				,searchLine: line
			});
			
		} else if( this.searchServer ){
			this.searchServer.submitRequest(
				line
				,{
					onSuccess: function(searchResults){
						_this._processSearchResults(searchResults);
					}
					,onError: function(err){ 
						_this._processSearchError(err);
					}
				}
			);
		};

		this.keyPressedSinceLastSearch = false;
		this._displayWait();
	}

	,_install: function(){
		
		var _this = this;
		
		var $textInput = this.getTextInput();
		
		if( this.options.initialSearchText ) {
			$textInput.val(this.options.initialSearchText);
		};
		
		if( $textInput.autocomplete ) {
			$textInput.autocomplete({
				source: this._getJqAutoCompleteSource()
			});
		};
		
		$textInput.keydown(function(e){
			_this._keyDown(e);
		});
		
		$textInput.focus(function(e) {
			_this._focus(e);
		});
		
		$textInput.blur(function(e) { 
			_this._blur(e);
		});
		
		var $searchButton = this.getSearchButton();
		if( $searchButton ) {
			$searchButton.click(function(e){
				_this._clickSearch(e);
			});
		};
	}
	
	,_focus: function(e) {
		var $textInput = this.getTextInput();
		if( this.options.initialSearchText ) {
			var value = $textInput.val();
			if(this.options.initialSearchText === value) {
				$textInput.val('');
			};
		};
		$textInput.select();
	}
	
	,_blur: function(e){
		if( this.options.initialSearchText ) {
			var $textInput = this.getTextInput();

			var value = $textInput.val();
			if( '' === value ) {
				$textInput.val(this.options.initialSearchText);
			};
		};
	}
	
	,_keyDown: function(e) {
		var charCode = null;
		if( null === e ) {
			e = window.event; // IE
		};
		if( null !== e ) {
			if( e.keyCode ) {
				charCode = e.keyCode;
			};
		};
		
		this.keyPressedSinceLastSearch = true;

//		$n2.log('_keyDown',charCode,e);
		if (13 === charCode || null === charCode) {
			// carriage return or I'm not detecting key codes
			// and have to submit on each key press - yuck...
			var line = this.getSearchLine();
			if( line.length > 0 ) {
				this._closeLookAhead();
				this.performSearch(line);
				this._closeLookAhead();
			};
		};
	}
	
	,_clickSearch: function(e){
		var line = this.getSearchLine();
		if( line.length > 0 ) {
			this._closeLookAhead();
			this.performSearch(line);
			this._closeLookAhead();
		};
	}
	
	,_closeLookAhead: function($textInput){
		if( !$textInput ) {
			$textInput = this.getTextInput();
		};
		if( $textInput.autocomplete ) {
			// Close autocomplete
			$textInput.autocomplete('close');
		};
	}
	
	,_processSearchResults: function(searchResults){
		var _this = this;
		
		if( this.options.displayFn ) {
			searchResults.type = 'results';
			this.options.displayFn(searchResults);
			
		} else if( this.options.dispatchService ) {
			this.options.dispatchService.send(DH, {
				type: 'searchResults'
				,results: searchResults
			});
			
		} else {
			$n2.log('Unable to return search results');
		};
	}

	,_processSearchError: function(err){
		if( this.options.displayFn ) {
			var display = {
				type:'error'
				,error: err
			};

			this.options.displayFn(display);
			
		} else if( this.options.dispatchService ) {
			this.options.dispatchService.send(DH, {
				type: 'searchResults'
				,error: err
			});
		};
	}

	,_displayWait: function(){
		if( this.options.displayFn ) {
			this.options.displayFn({type:'wait'});
		};
	}

	,_getJqAutoCompleteSource: function() {
		var _this = this;
		return function(request, cb) {
			_this._jqAutoComplete(request, cb);
		};
	}
	
	,_jqAutoComplete: function(request, cb) {
		// Redirect to look ahead service, but intercept
		// result.
		var _this = this;
		var lookAheadService = this.searchServer.getLookAheadService();
		lookAheadService._jqAutoComplete(request, function(res){
			if( _this.keyPressedSinceLastSearch ) {
				cb(res);
			} else {
				// suppress since the result of look ahead service
				// comes after search was requested
				cb(null);
			};
		});
	}

	,_handle: function(m){
		if( 'searchInitiate' === m.type ){
			var $textInput = this.getTextInput();
			$textInput.val(m.searchLine);
			
		} else if( 'selected' === m.type 
		 || 'unselected' === m.type ){
			var $textInput = this.getTextInput();
			if( this.options.initialSearchText ) {
				$textInput.val(this.options.initialSearchText);
			} else {
				$textInput.val('');
			};
		};
	}
});

// ============ SearchServer ========================

var SearchServer = $n2.Class({
	
	options: null,

	designDoc: null,
	
	db: null,
	
	dateService: null,
	
	dispatchService: null,
	
	customService: null,
	
	constraint: null,
	
	searchLimit: null,
	
	lookAheadLimit: null,
	
	lookAheadPrefixMin: null,
	
	lookAheadCacheSize: null,
	
	lookAheadService: null,
	
	initialize: function(opts_) {
		var opts = $n2.extend({
			designDoc: null
			,db: null
			,dateService: null
			,dispatchService: null
			,customService: null
			,constraint: null
			,searchLimit: 25
			,lookAheadLimit: 5
			,lookAheadPrefixMin: 3
			,lookAheadCacheSize: 10
		},opts_);
		
		var _this = this;

		this.designDoc = opts.designDoc;
		this.db = opts.db;
		this.dateService = opts.dateService;
		this.dispatchService = opts.dispatchService;
		this.customService = opts.customService;
		this.constraint = opts.constraint;
		this.searchLimit = opts.searchLimit;
		this.lookAheadLimit = opts.lookAheadLimit;
		this.lookAheadPrefixMin = opts.lookAheadPrefixMin;
		this.lookAheadCacheSize = opts.lookAheadCacheSize;

		this.lookAheadService = null;

		var d = this.dispatchService;
		if( d ){
			var f = function(m){
				_this._handle(m);
			};
			var h = d.getHandle('n2.couchSearch');
			d.register(h,'searchInitiate',f);
		};
	},
	
	setConstraint: function(constraint){
		this.constraint = constraint;
		
		if( this.lookAheadService ){
			this.lookAheadService.setConstraint(constraint);
		};
	},

	getLookAheadService: function() {
		if( null === this.lookAheadService ) {
			this.lookAheadService = new LookAheadService({
				designDoc: this.designDoc
				,lookAheadLimit: this.lookAheadLimit
				,lookAheadPrefixMin: this.lookAheadPrefixMin
				,lookAheadCacheSize: this.lookAheadCacheSize
				,constraint: this.constraint
			});
		};
		
		return this.lookAheadService;
	},

	/*
	 * Creates a request for search terms and returns an
	 * object to represent the request. The returned object
	 * is an instance of class SearchRequest 
	 */
	submitRequest: function(searchTerms, opts_) {
		var requestOptions = $n2.extend({
			designDoc: this.designDoc
			,db: this.db
			,dateService: this.dateService
			,searchLimit: this.searchLimit
			,constraint: this.constraint
		},opts_);
		
		return new SearchRequest(searchTerms, requestOptions);
	},
	
	getJqAutoCompleteSource: function() {
		return this.getLookAheadService().getJqAutoCompleteSource();
	},
	
	installSearch: function(opts_) {
		return new SearchInput(opts_, this);
	},
	
	installSearchWidget: function(opts_) {
		var opts = $n2.extend({
			elem: null
			,label: null
			,useButton: false
			,buttonLabel: null
			,doNotDisable: false
			,constraint: null
		},opts_);
		
		var customService = this.customService;
		
		// Parent element
		var $elem = $(opts.elem);

		// Text box label
		var searchWidgetLabel = opts.label;
		if( null === searchWidgetLabel 
		 && customService){
			searchWidgetLabel = customService.getOption('searchWidgetText',null);
		};
		if( null === searchWidgetLabel ){
			searchWidgetLabel = _loc('search the atlas');
		};

		// Text box
		$elem.empty();
		var searchInput = $('<input type="text">')
			.addClass('search_panel_input')
			.val( searchWidgetLabel )
			.appendTo($elem);
		
		if( opts.doNotDisable ){
			// OK
		} else {
			searchInput.addClass('n2_disable_on_edit');
		};
		
		// Search button label
		var searchButtonLabel = opts.buttonLabel;
		if( null === searchButtonLabel 
		 && customService ){
			searchButtonLabel = customService.getOption('searchButtonText',null);
		};
		if( null === searchButtonLabel ){
			searchButtonLabel = _loc('Search');
		};
		
		// Search button
		var searchButton = null;
		if( opts.useButton ){
			searchButton = $('<input type="button">')
				.val( searchButtonLabel )
				.appendTo($elem);
		};
		
		return new SearchInput({
				textInput: searchInput
				,initialSearchText: searchWidgetLabel
				,dispatchService: this.dispatchService
				,searchButton: searchButton
				,constraint: opts.constraint
			}, this);
	},
	
	_handle: function(m){
		if( 'searchInitiate' === m.type ){
			var searchTerms = m.searchLine;

			var dispatcher = this.dispatchService;
			var h = dispatcher.getHandle('n2.couchSearch');
			this.submitRequest(searchTerms, {
				onSuccess: function(searchResults){
					dispatcher.send(h, {
						type: 'searchResults'
						,results: searchResults
					});
				}
				,onError: function(err){
					dispatcher.send(h, {
						type: 'searchError'
						,error: err
					});
				}
			});
		};
	}
});

// ================ API ===============================

$n2.couchSearch = {
	SearchServer: SearchServer
	,SearchRequest: SearchRequest
};

})(jQuery,nunaliit2);