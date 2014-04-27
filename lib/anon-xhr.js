// Include net/XHR module
const { XMLHttpRequest } = require("sdk/net/xhr");

/**
 * Create an anonym XML HTTP request.
 */
var request = function (method, url, callback) {
	// Create XML HTTP request object
	var request = new XMLHttpRequest({
		mozBackgroundRequest: true, // Request not tied to UI
		mozAnon: true // Anonym request (no cookies)
	});
	// Set loading callback
	request.onload = callback;
	// Open request
	request.open(method, url);
	// Send request
	request.send();
}

var dump = function (object, filter) {
	rdump(object, 0, 5, filter);
}

var rdump = function (object, depth, maxDepth, filter) {
	// Check depth
	if (depth == 0) {
		var header = "Dumping";
		if (typeof filter != "undefined")
			header+= " (" + filter + ")";
		header+= ": " + object;
		console.log(header);
	} else if (depth > maxDepth) {
		return;
	}
	// Compute padding
	var padding = "";
	for (var i=0; i<depth; i++) {
		padding = padding + "  ";
	}
	// Dump each member of object
	for (var index in object) {
		// Check and apply member name filter
		if (typeof filter != "undefined" && !index.contains(filter))
			continue
		// Try to get member value
		var member = undefined;
		try {
			member = object[index];
		} catch (error) {
		}
		// Check member type
		if (typeof member =="undefined") {
			// Member could not be read
			console.log(padding + " - " + index + ": <undefined>");
		} else if (typeof member === "object") {
			// Dump member name
			console.log(padding + " - " + index + ":");
			// Recursive dump next level
			rdump(member, depth+1, maxDepth, filter);
		} else {
			// Dump member name and value
			console.log(padding + " - " + index + ": " + member);
		}
	}
}

exports.request = request;
exports.dump = dump;