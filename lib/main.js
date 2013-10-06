// Include modules
var Request = require("sdk/request").Request;
var SimpleStorage = require("sdk/simple-storage");
var Notifications = require("sdk/notifications");
// Include CryptoJS library
var CryptoJS = require("CryptoJS/core").CryptoJS;
require("CryptoJS/hmac");
require("CryptoJS/sha1");

// Declare application constants
const app_id = "fr.hardcoding.firefox.freeboxos";
const app_name = "Freebox OS";
const app_version = "0.1";
const device_name = "Workstation";
// Declare application authentication statuses
var app_token = null;
var track_id = null;
var auth_token = null;
var session_token = null;

// Create freebox API
var freebox = {
	api_version: null,
	api_base_url: null,

	/*
	 * Discovery module.
	 */
	discover: function () {
		// Send discover request
		var discoveryRequest = Request({
			url: "http://mafreebox.freebox.fr/api_version",
			onComplete: function (response) {
				if (response.json) {
					// Save API version and API base URL
					api_version = response.json.api_version;
					api_base_url = response.json.api_base_url;
					// Authorize application
					freebox.login.authorize();
				} else {
					console.log("Freebox OS not found.");
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
		 * Track authorization progress.
		 */
		authorize: function (track_id) {
			// Check track id
			if (track_id) {
				// Send track authorization status
				var authorizeRequest = Request({
					url: "http://mafreebox.freebox.fr/api/v1/login/authorize/" + track_id,
					onComplete: function (response) {
						if (response.json && response.json.success === true) {
							// Get track status and challenge
							var status = response.json.result.status;
							var challenge = response.json.result.challenge;
							console.log("Current track status: " + status);
							// Get a session
							freebox.login.session(challenge);
						} else {
							console.log("Unable to track authorization.");
						}
					}
				}).get();
			} else {
				// Check storage for authorization
				if (SimpleStorage.storage.app_token && SimpleStorage.storage.track_id) {
					// Restore app token and track id from simple storage
					app_token = SimpleStorage.storage.app_token;
					track_id = SimpleStorage.storage.track_id;
					console.log("Authorization restored with track id: "+track_id);
					// Track authorization
					freebox.login.authorize(track_id);
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
								// Track authorization
								freebox.login.authorize(track_id);
							} else {
								console.log("Application was not authorized.");
							}
						} else {
							console.log("Unable to authorize application.");
						}
					}
				}).post();
			}
		},
		/*
		 * Open a session.
		 */
		session: function (challenge) {
			// Create request content
			var content = JSON.stringify({
				app_id: app_id,
				password: "" + CryptoJS.HmacSHA1(challenge, app_token),
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
						console.log("Unable to login.");
						console.log(response.text);
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
						console.log("Download added.");
						// Notify user
						Notifications.notify({
							title: "Freebox server",
							text: "Le téléchargement a été ajouté"
						});
					} else {
						console.log("Unable to add download.");
						console.log(response.text);
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
			window.dialog.oldOnOK();
		}
	},
	onUntrack: function (window) {
	}
};
// Include deprecated window-utils
var WinUtils = require("window-utils");
// Register window tracker delegate
var tracker = new WinUtils.WindowTracker(windowTrackerDelegate);

// Initialize freebox API
freebox.discover();