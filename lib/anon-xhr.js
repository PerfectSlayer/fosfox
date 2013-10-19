// Inclure net/XHR module
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

var dump = function (object, depth) {
	if (typeof depth === "undefined") {
		depth = 0;
		console.log("Dumping: " + object);
	}
	var padding = "";
	for (var i=0; i<depth; i++) {
		padding = padding + "  ";
	}
	for (var index in object) {
		var member = object[index];
		if (typeof member === "object") {
			console.log(padding + " - " + index + ":");
			dump(member, depth+1);
		} else {
			console.log(padding + " - " + index + ": " + member);
		}
	}
}

exports.request = request;
exports.dump = dump;