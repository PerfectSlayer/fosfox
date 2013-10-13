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
	dump("Anon:"+request.mozAnon);
	// Set loading callback
	request.onload = callback;
	// Configure response type
	// request.responseType = "json";
	// Open request
	request.open(method, url);
	// Send request
	request.send();
}

var dump = function (object) {
	console.log(object);
	for (var index in object) {
		console.log(" - " + index + ": " + object[index]);
	}
}

exports.request = request;
exports.dump = dump;