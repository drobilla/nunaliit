function(doc) {
	// !code vendor/nunaliit2/n2.couchUtils.js

	// Search complete doc for all nunaliit_type values
	var typeMap = {};
	n2utils.extractTypes(doc,typeMap);
	for(var type in typeMap) {
		emit(type,null);
	};
}