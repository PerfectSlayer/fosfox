"use strict";

// Include required modules
const Base64 = require('sdk/base64');
const Prefs = require('sdk/simple-prefs').prefs;
const SimpleStorage = require('sdk/simple-storage');
const Url  = require('sdk/url');

/*
 * Initialize history.
 */
function load() {
	// Get paths from storage
	var paths = SimpleStorage.storage.paths;
	// Check paths
	if (typeof paths === 'undefined' || paths.length === 0) {
		// Create paths
		paths = {
			domains: {
			},
			last: undefined
		};
		// Store created paths
		SimpleStorage.storage.paths = paths;
	}
	// Return paths
	return paths;
}

/*
 * Get location path for a domain.
 * The location path is return according the location strategy:
 * - 'alwaysask' will return null,
 * - 'learn' will return last path used for domain or null if not defined,
 * - 'usedefault' will return default location.
 */
function getByDomain(domain) {
	// TODO erase
	console.log(Prefs);
	// Check always ask strategy
	if (Prefs.locationStrategy === 'alwaysask')
		// Return to ask location
		return null;
	// Check use default strategy
	if (Prefs.locationStrategy === 'usedefault')
		// Return default location from preference
		return Prefs.defaultLocation;
	/*
	 * Apply learn strategy.
	 */
	// Get stored paths
	var paths = load();
	// Get path for domain
	var path = paths.domains[domain];
	// Check if path is defined
	if (typeof path === 'undefined')
		return null;
	// Return path for domain
	return path;
}

/*
 * Get default path to use.
 * The default path is return according the location strategy:
 * - 'alwaysask' and qlearn' will return last location used or default path if not defined,
 * - 'usedefault' will return default location.
 */
function getDefault() {
	// Check location strategy preference
	var locationStrategy = Prefs.locationStategy;
	// Check use default strategy
	if (locationStrategy === 'usedefault')
		// Return default location from preference
		return Prefs.defaultLocation;
	/*
	 * Apply alwaysask and learn stategies.
	 */
	// Get stored paths
	var paths = load();
	// Get last path used
	var path = paths.last;
	// Check path type
	if (typeof path !== 'undefined')
		return path;
	// Return default location from preference
	return Prefs.defaultLocation;
}

/*
 * Add a path history for a domain.
 */
function add(domain, path) {
	// Get stored paths
	var paths = load();
	// Add path for domain
	paths.domains[domain] = path;
	// Save last path
	paths.last = path;
}

/*
 * Get the domain of an URL.
 */
function getDomain(url) {
	// Parse URL
	var parsedUrl = Url.URL(url);
	// Return URL host
	return parsedUrl.host;
}

/*
 * Decode path to name.
 */
function decodePath(path) {
	// Decode base64 path
	var utf8Name = Base64.decode(path);
	// Decode UTF8 name
	return decodeURIComponent(escape(utf8Name)); 
}

// Export location manager API
exports.getByDomain = getByDomain;
exports.getDefault = getDefault;
exports.add = add;
exports.getDomain = getDomain;
exports.decodePath = decodePath;