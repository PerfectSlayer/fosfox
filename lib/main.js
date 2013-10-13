// Include modules
var Request = require("sdk/request").Request;
var SimpleStorage = require("sdk/simple-storage");
var Notifications = require("sdk/notifications");
var Timers = require("sdk/timers");
var Self = require("sdk/self");
// Include CryptoJS library
var CryptoJS = require("hmac-sha1").CryptoJS
// Include AnonXhr library
var AnonXhr = require("anon-xhr");

// Declare application constants
const app_id = "fr.hardcoding.firefox.freeboxos";
const app_name = "Freebox OS for Firefox";
const app_version = "0.1";
const device_name = "Workstation";
// Declare application authentication statuses
var app_token = null;
var track_id = null;
var session_token = null;

/*
 * Freebox API.
 */
var freebox = {
	api_version: null,
	api_base_url: null,

	/*
	 * Discovery module.
	 */
	discover: function (callback) {
		// Send discover request
		var discoveryRequest = Request({
			url: "http://mafreebox.freebox.fr/api_version",
			onComplete: function (response) {
				if (response.json) {
					// Save API version and API base URL
					api_version = response.json.api_version;
					api_base_url = response.json.api_base_url;
					// Notify callback freebox OS found
					callback(true);
				} else {
					console.warn("Freebox OS not found.");
					// Notify callback freebox OS not found
					callback(false);
				}
			}
		}).get();
	},

	/*
	 * Login module.
	 */
	login: {
		/*
		 * Request authorization.
		 */
		authorize: function (callback) {
			// Check storage for authorization
			if (SimpleStorage.storage.app_token && SimpleStorage.storage.track_id) {
				// Restore app token and track id from simple storage
				app_token = SimpleStorage.storage.app_token;
				track_id = SimpleStorage.storage.track_id;
				console.log("Authorization restored with track id: " + track_id);
				// Notify callback with track_id
				callback(track_id);
				return;
			}
			// Create request content
			var content = JSON.stringify({
				app_id: app_id,
				app_name: app_name,
				app_version: app_version,
				device_name: device_name
			});
			// Send authorize request
			var authorizeRequest = Request({
				url: "http://mafreebox.freebox.fr/api/v1/login/authorize/",
				content: content,
				onComplete: function (response) {
					if (response.json) {
						if (response.json.success) {
							// Save app_token and track_id
							app_token = response.json.result.app_token;
							track_id = response.json.result.track_id;
							// Store app_token and track_id to storage
							SimpleStorage.storage.app_token = app_token;
							SimpleStorage.storage.track_id = track_id;
							console.log("App token: " + app_token);
							// Notify callback with track_id
							callback(track_id);
						} else {
							console.warn("Application was not authorized.");
						}
					} else {
						console.warn("Unable to authorize application.");
					}
				}
			}).post();
		},
		/*
		 * Track authorization progress.
		 */
		authorizeTrack: function (track_id, callback) {
			// Send track authorization status
			var authorizeRequest = Request({
				url: "http://mafreebox.freebox.fr/api/v1/login/authorize/" + track_id,
				onComplete: function (response) {
					if (response.json && response.json.success === true) {
						// Get status
						var status = response.json.result.status;
						console.log("Current track status: " + status);
						// Notify callback with status
						callback(status);
					} else {
						console.warn("Unable to track authorization.");
					}
				}
			}).get();
		},
		/*
		 * Clear authorization.
		 */
		clear: function () {
			// Clear authorization
			app_token = null;
			track_id = null;
			session_token = null;
			// Clear stored authorization
			delete SimpleStorage.storage.app_token;
			delete SimpleStorage.storage.track_id;
		},
		/*
		 * Obtain a session token.
		 */
		login: function(callback) {
			// Create request callback
			var requestCallback = function () {
				// Check state
				if (this.readyState != 4 || this.status != 200)
					return;
				// Parse response
				var responseJson = JSON.parse(this.response);
				AnonXhr.dump(responseJson);
				// Check response
				if (responseJson.success === true) {
					// Return challenge
					callback(responseJson.result.challenge);
				} else {
					console.warn("Unable to login.");
				}
			}
			// Send anonym request
			AnonXhr.request("get", "http://mafreebox.freebox.fr/api/v1/login/", requestCallback);
		},
		/*
		 * Open a session.
		 */
		session: function (challenge) {
			console.error("Challenge: " + challenge);
			console.error("Token: " + app_token);
			// Create request content
			var content = JSON.stringify({
				app_id: app_id,
				password: "" + CryptoJS.HmacSHA1(challenge, app_token)
			});
			// Send login request
			var sessionRequest = Request({
				url: "http://mafreebox.freebox.fr/api/v1/login/session/",
				content: content,
				onComplete: function (response) {
					if (response.json && response.json.success === true) {
						// Save session token
						session_token = response.json.result.session_token;
						console.log("Logged in with token: " + session_token);
						console.log("Current permissions:");
						for (var key in response.json.result.permissions)
						 console.log(key + ": " + response.json.result.permissions[key]);
					} else {
						console.warn("Unable to login.");
					}
				}
			}).post();
		}
	},

	/*
	 * Download module.
	 */
	downloads: {
		/*
		 * Add a new download task.
		 */
		add: function (url) {
			console.log("Link: " + url);
			// Check session token
			if (session_token === null)
				return false;
			// Create download add request
			var downloadAddRequest = Request({
				url: "http://mafreebox.freebox.fr/api/v1/downloads/add",
				headers: {
					"X-Fbx-App-Auth": session_token
				},
				content: {
					download_url: url
				},
				onComplete: function (response) {
					if (response.json && response.json.success === true) {
						console.info("Download added.");
						// Notify user
						Notifications.notify({
							title: "Freebox server",
							text: "Le téléchargement a été ajouté.",
							iconURL: Self.data.url("images/download.png")
						});
					} else {
						console.warn("Unable to add download.");
					}
				}
			}).post();
			// Return as successful
			return true;
		}
	}
};

/*
 * Create hook to add freebox server option to download page.
 */
// Create window tracker delegate
var windowTrackerDelegate = {
	onTrack: function (window) {
		// Check download window
		if (window.location != "chrome://mozapps/content/downloads/unknownContentType.xul")
			return;
		/*
		 * Edit XUL window.
		 */
		// Get mode radiogroup element
		var modeElement = window.document.getElementById("mode");
		// Get save radio element
		var saveElement = window.document.getElementById("save");
		// Create freebox radio element
		var freeboxElement = window.document.createElement("radio");
		freeboxElement.setAttribute("id", "freebox");
		freeboxElement.setAttribute("label", "Freebox server");
		freeboxElement.setAttribute("flex", "1");
		// Create hbox element
		var hboxElement = window.document.createElement("hbox");
		hboxElement.setAttribute("flex", "1");
		// Append freebox radio element to hbox element
		hboxElement.appendChild(freeboxElement);
		// Insert hbox element into mode radiogroup element
		modeElement.insertBefore(hboxElement, saveElement);
		/*
		 * Edit XUL behavior.
		 */
		// Get window element
		var windowElement = window.document.getElementById("unknownContentType");
		// Get current validation script
		var currentValidation = windowElement.getAttribute("ondialogaccept");
		// Save old validation behavior
		window.dialog.oldOnOK = window.dialog.onOK;
		// Define new validation behavior
		window.dialog.onOK = function () {
			// Ensure freebox radio element is selected
			if (freeboxElement.selected)
				// Check freebox downloada add task
				return freebox.downloads.add(window.dialog.mLauncher.source.spec);
			// Otherwise, delegate to old behavior
			return window.dialog.oldOnOK();
		}
	},
	onUntrack: function (window) {
	}
};
// Include deprecated window-utils
var WinUtils = require("window-utils");
// Register window tracker delegate
var tracker = new WinUtils.WindowTracker(windowTrackerDelegate);

/*
 * Initialize freebox OS application.
 */
var discoverCallback = function (found) {
	// Ensure freebox OS is found
	if (!found) {
		// TODO No freebox OS found, notify user
		return;
	}
	// Authorize application
	freebox.login.authorize(authorizeCallback);
};
var authorizeCallback = function (track_id) {
	freebox.login.authorizeTrack(track_id, authorizeTrackCallback);
};
var authorizeTrackCallback = function (status) {
	// Check status
	if (status == "granted") {
		console.log(" + login");
		// Get a challenge to log application
		freebox.login.login(loginCallback);
	} else if (status == "pending") {
		console.log(" + retry");
		console.log(authorizeCallback);
		Timers.setTimeout(authorizeCallback(track_id), 2000);
	} else if (status == "unknown" || status == "timeout" || status == "denied") {
		// TODO login failed, notify user
		// Clear application authorization
		freebox.login.clear();
		// Notify freebox OS discovery
		discoverCallback(true);
	}
};
var loginCallback = function (challenge) {
	// Log application with the given challenge
	freebox.login.session(challenge);
};
// Start freebox OS discovery
freebox.discover(discoverCallback);