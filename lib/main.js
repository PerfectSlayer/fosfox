var Request = require("sdk/request").Request;
var SimpleStorage = require("sdk/simple-storage");
// var CryptoJS = require("core");
var CryptoJS = require("CryptoJS/core").CryptoJS;
require("CryptoJS/hmac");
require("CryptoJS/sha1");

var app_id = "fr.hardcoding.firefox.freeboxos";
var app_name = "Freebox OS";
var app_version = "0.1";
var device_name = "Workstation";

var app_token = null;
var track_id = null;
var auth_token = null;
var session_token = null;

var freebox = {
	api_version: null,
	api_base_url: null,

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
					freebox.authorize();
				} else {
					console.log("Freebox OS not found.");
				}
			}
		}).get();
	},

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
						// Log application
						freebox.login(challenge);
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
				freebox.authorize(track_id);
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
							freebox.authorize(track_id);
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

	login: function (challenge) {
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
};


freebox.discover();