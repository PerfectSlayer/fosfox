'use strict';

// Include required modules
const Base64 = require('sdk/base64');
const Prefs = require('sdk/simple-prefs').prefs;
const SimpleStorage = require('sdk/simple-storage');
const Url = require('sdk/url');

/*
 * Initialize history.
 */
function load() {
	// Get paths from storage
	let paths = SimpleStorage.storage.paths;
	// Check paths
	if (typeof paths === 'undefined' || paths.length === 0) {
		// Create paths
		paths = {
			domains: {},
			last: undefined
		};
		// Store created paths
		SimpleStorage.storage.paths = paths;
	}
	// Return paths
	return paths;
}

/*
 * Get location for an URL.
 * The location is return according the location strategy:
 * - 'alwaysAsk' will return the not always used last path,
 * - 'learn' will return last location used for the URL domain if exist or the not always used last path,
 * - 'useDefault' will return the always used default location path.
 */
function get(url) {
	// Check always ask strategy
	if (Prefs.locationStrategy === 'alwaysAsk') {
		// Return not always used last path
		return {
			'path': getLastPath(),
			'always': false
		};
	}
	// Check use default strategy
	if (Prefs.locationStrategy === 'useDefault') {
		// Return always used default location path from preferences
		return {
			'path': Prefs.defaultLocation,
			'always': true
		};
	}
	/*
	 * Apply learn strategy.
	 */
	// Get URL domain
	let domain = getDomain(url);
	// Get stored paths
	let paths = load();
	// Get location for domain
	let location = paths.domains[domain];
	// Check if location is defined
	if (typeof location === 'undefined') {
		// Return not always used last path
		return {
			'path': getLastPath(),
			'always': false
		};
	}
	// Return path for domain
	return location;
}

/*
 * Get all paths saved indexed by their domains.
 */
function getAll() {
	// Get stored paths
	let paths = load();
	// Return all paths saved
	return paths.domains;
}

/*
 * Add a path for an URL.
 */
function save(url, location) {
	// Get URL domain
	let domain = getDomain(url);
	// Get stored paths
	let paths = load();
	// Add path for domain
	paths.domains[domain] = location;
}

/*
 * Remove the path for a domain.
 */
function remove(domain) {
	// Get store paths
	let paths = load();
	// Remove the domain path
	delete paths.domains[domain];
}

/*
 * Get the last path used, default path if no previous path.
 */
function getLastPath() {
	// Get stored paths
	let paths = load();
	// Get last path used
	let path = paths.last;
	// Check path type
	if (typeof path !== 'undefined') {
		return path;
	}
	// Return default location from preference
	return Prefs.defaultLocation;
}

/*
 * Set the last path used.
 */
function setLastPath(last) {
	// Get stored paths
	let paths = load();
	// Set last path
	paths.last = last;
}

/*
 * Get the domain of an URL.
 */
function getDomain(url) {
	// Parse URL
	let parsedUrl = Url.URL(url);
	// Return URL host
	return parsedUrl.host;
}

/*
 * Decode path to name.
 */
function decodePath(path) {
	// Decode base64 path
	let utf8Name = Base64.decode(path);
	// Decode UTF8 name
	return decodeURIComponent(escape(utf8Name));
}

// Export location manager API
exports.get = get;
exports.getAll = getAll;
exports.save = save;
exports.remove = remove;
exports.getLastPath = getLastPath;
exports.setLastPath = setLastPath;
exports.decodePath = decodePath;
