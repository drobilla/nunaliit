function(doc) {

// !code vendor/nunaliit2/utils.js

	var map = n2utils.extractSearchTerms(doc);
	if( map ) {
		for(var word in map) {
			// key is word, value is number of times word
			// is found in document
			emit(word,map[word].count)
		};
	};
};