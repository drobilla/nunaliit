/*
Copyright (c) 2011, Geomatics and Cartographic Research Centre, Carleton 
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

$Id: n2.couchConfiguration.js 8445 2012-08-22 19:11:38Z jpfiset $
*/
;(function($,$n2){

// Localization
var _loc = function(str){ return $n2.loc(str,'nunaliit2-couch'); };

function Configure(options_){
	
	var options = $n2.extend({
		couchServerUrl: null // string
		,atlasDbUrl: null // string
		,atlasDesignName: 'atlas'
		,progressServerUrl: null // string
		,mediaUrl: null // string
		,uploadServerUrl: null // string
		,exportServerUrl: null // string
		,onSuccess: function(config){}
	},options_);

	var configuration = {
		directory: {}
	};

	// Dispatcher
	configuration.directory.dispatchService = new $n2.dispatch.Dispatcher();
	
 	// Turn off cometd
 	$.cometd = {
 		init: function(){}
 		,subscribe: function(){}
 		,publish: function(){}
 	};
 	
 	$n2.couch.initialize({
    	pathToServer: options.couchServerUrl
    	,onSuccess: couchInitialized
 	});
	
	function couchInitialized() {
		
		configuration.couchServer = $n2.couch.DefaultServer;
		configuration.directory.couchServer = configuration.couchServer;

		$.NUNALIIT_AUTH.init({
			onSuccess: authInitialized
			,autoAnonymousLogin: false
			,directory: configuration.directory
		});
	};
	
	function authInitialized() {
		
		configuration.auth = $.NUNALIIT_AUTH;
		configuration.directory.authService = configuration.auth;
		
		configuration.atlasDb = configuration.couchServer.getDb({dbUrl:options.atlasDbUrl});
		configuration.atlasDesign = configuration.atlasDb.getDesignDoc({ddName:options.atlasDesignName});

		configuration.atlasDb.getChangeNotifier({
			onSuccess: function(notifier){
				configuration.atlasNotifier = notifier;
				configuration.directory.notifierService = notifier;
				notifierInitialized();
			}
		});
	};
	
	function notifierInitialized() {
		configuration.directory.schemaRepository = new $n2.couchSchema.CouchSchemaRepository({
			db: configuration.atlasDb
			,designDoc: configuration.atlasDesign
			,dispatchService: configuration.directory.dispatchService
			,preload: true
			,preloadedCallback: schemasPreloaded 
		});
	};
	
	function schemasPreloaded() {
		
	 	$n2.couchL10n.Configure({
			db: configuration.atlasDb
	 		,designDoc: configuration.atlasDesign 
	 	});

	 	configuration.progressServer = new $n2.progress.ProgressServer({
			url: options.progressServerUrl
		});

	 	configuration.uploadServer = new $n2.upload.Upload({
			url: options.uploadServerUrl
			,progressServer: configuration.progressServer
		});
		configuration.directory.uploadService = configuration.uploadServer;

		configuration.directory.exportService = new $n2.couchExport.Export({
			url: options.exportServerUrl
		});
		
	 	configuration.searchServer = new $n2.couchSearch.SearchServer({
			designDoc: configuration.atlasDesign
			,db: configuration.atlasDb
		});
		configuration.directory.searchService = configuration.searchServer;
		
	 	configuration.mediaRelativePath = options.mediaUrl;

	 	configuration.cacheService = new $n2.cache.CacheService();
	 	$n2.cache.defaultCacheService = configuration.cacheService;
		configuration.directory.cacheService = configuration.cacheService;

	 	configuration.requests = new $n2.couchRequests({
			db: configuration.atlasDb
			,userDb: $n2.couch.getUserDb()
			,designDoc: configuration.atlasDesign
			,cacheService: configuration.cacheService
			,directory: configuration.directory
		});
		configuration.directory.requestService = configuration.requests;

		configuration.directory.dispatchSupport = new $n2.couchDispatchSupport.DispatchSupport({
			db: configuration.atlasDb
			,directory: configuration.directory
		});
		
	 	configuration.show = new $n2.couchShow.Show({
			db: configuration.atlasDb
			,designDoc: configuration.atlasDesign
			,serviceDirectory: configuration.directory
		});
		configuration.directory.showService = configuration.show;
		
	 	configuration.couchEditor = new $n2.CouchEditor.Editor({
			db: configuration.atlasDb
			,serviceDirectory: configuration.directory
		});
		
	 	configuration.directory.schemaEditorService = new $n2.CouchEditor.SchemaEditorService({
			serviceDirectory: configuration.directory
		});

	 	configuration.contributions = new $n2.couchContributions({
			db: configuration.atlasDb
			,designDoc: configuration.atlasDesign
			,showService: configuration.show
			,uploads: configuration.uploadServer
		});
	 	
	 	configuration.popupHtmlFn = function(opt_){
	 		var doc = opt_.feature.data;
	 		
	 		var $div = $('<span></span>');
	 		configuration.show.displayBriefDescription($div,{},doc);
	 		
	 		var $wrapper = $('<div></div>');
	 		$wrapper.append($div);
	 		var html = $wrapper.html();
	 		
	 		opt_.onSuccess(html);
	 	};
	 	
	 	// Cometd replacement
	 	configuration.serverSideNotifier = new $n2.couchServerSide.Notifier({
	 		dbChangeNotifier: configuration.atlasNotifier
	 		,directory: configuration.directory
	 	});
	 	configuration.directory.serverSideNotifier = configuration.serverSideNotifier;

	 	// Set up hover sound
	 	configuration.hoverSoundService = new $n2.couchSound.HoverSoundService({
			db: configuration.atlasDb
			,serviceDirectory: configuration.directory
	 	});
	 	$n2.hoverSoundService = configuration.hoverSoundService;
		configuration.directory.hoverSoundService = configuration.hoverSoundService;
		
		callCustomConfiguration();
	};
	
	function callCustomConfiguration(){
		if( window 
		 && window.nunaliit_custom 
		 && typeof(window.nunaliit_custom.configuration) === 'function' ){
			window.nunaliit_custom.configuration(configuration, configurationDone);
		} else {
			configurationDone();
		};
	};
	
	function configurationDone(){
		$n2.log('nunaliit configuration',configuration);
		options.onSuccess(configuration);
	};
};

$n2.couchConfiguration = {
	Configure: Configure
};

})(jQuery,nunaliit2);