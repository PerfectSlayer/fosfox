// Include modules
const Base64 = require("sdk/base64");
const Notifications = require("sdk/notifications");
const Panel = require("sdk/panel");
const Request = require("sdk/request").Request;
const SimpleStorage = require("sdk/simple-storage");
const Self = require("sdk/self");
const Timers = require("sdk/timers");
const Url = require("sdk/url");
const Widget = require("sdk/widget");
// Include CryptoJS library
const CryptoJS = require("hmac-sha1").CryptoJS;
// Include AnonXhr library
const AnonXhr = require("anon-xhr");

// Declare application constants
const app_id = "fr.hardcoding.firefox.freeboxos";
const app_name = "Freebox OS for Firefox";
const app_version = "0.1";
const device_name = "Workstation";
// Declare application authentication statuses
var app_token = null;
var track_id = null;
var session_token = null;
// Declare download variables
var downloadUrl = null;
var downloadPath = null;

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
		session: function (challenge, callback) {
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
					if (response.json) {
						// Check session opening success
						if (response.json.success === true) {
							// Save session token
							session_token = response.json.result.session_token;
							console.log("Logged in with token: " + session_token);
							console.log("Current permissions:");
							for (var key in response.json.result.permissions)
							 console.log(key + ": " + response.json.result.permissions[key]);
							// Notify callback
							callback(true);
						} else {
							// Notify callback
							callback(false, response.json.error_code);
						}
					} else {
						console.warn("Unable to open session.");
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
		add: function (url, path) {
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
					download_url: url,
					download_dir: path
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
	},
	
	/*
	 * File system module.
	 */
	fs: {
		/*
		 * List content of a path.
		 */
		ls: function (path, callback, onlyFolder) {
			// Check session token
			if (session_token === null)
				return false;
			// Create fs ls request
			var downloadAddRequest = Request({
				url: "http://mafreebox.freebox.fr/api/v1/fs/ls/" + path,
				headers: {
					"X-Fbx-App-Auth": session_token
				},
				content: {
					onlyFolder: onlyFolder===true ? "1" : "0"
				},
				onComplete: function (response) {
					if (response.json && response.json.success === true) {
						// Notify callback
						callback(path, response.json.result);
					} else {
						console.warn("Unable to list files.");
						AnonXhr.dump(response);
					}
				}
			}).get();
			// Return as successful
			return true;
		}
	}
};

/*
 * Create path history manager.
 */
var pathHistory = {
	/*
	 * Initialize history.
	 */
	load: function () {
		// Get paths from storage
		var paths = SimpleStorage.storage.paths;
		// Check paths
		if (typeof paths === "undefined" || paths.length === 0) {
			// Create paths
			paths = {
				domains: {
				},
				last: null
			};
			// Store created paths
			SimpleStorage.storage.paths = paths;
		}
		// Return paths
		return paths;
	},
	/*
	 * Get last path history for a domain.
	 * If no previous path for the domain, get last path used.
	 * If no previous path, return root.
	 */
	get: function (domain) {
		// Get stored paths
		var paths = pathHistory.load();
		// Get path for domain
		var path = paths.domains[domain];
		if (typeof path !== "undefined" && path !== null)
			return path;
		// Get last path
		var path = paths.last;
		if (typeof path !== "undefined" && path !== null)
			return path;
		// Return root path
		return "";
	},
	/*
	 * Add a path history for a domain.
	 */
	add: function (domain, path) {
		// Get stored paths
		var paths = pathHistory.load();
		// Add path for domain
		paths.domains[domain] = path;
		// Save last path
		paths.last = path;
	},
	/*
	 * Get the domain of an URL.
	 */
	getDomain: function (url) {
		// Parse URL
		var parsedUrl = Url.URL(url);
		// Return URL host
		return parsedUrl.host;
	},
	/*
	 * Decode path to name.
	 */
	decodePath: function (path) {
		// Decode base64 path
		var utf8Name = Base64.decode(path);
		// Decode UTF8 name
		return decodeURIComponent(escape(utf8Name)); 
	}
};

/*
 * Create hook to add freebox server option to download page.
 */
// Create window tracker delegate
var windowTrackerDelegate = {
	/*
	 * Browser button.
	 */
	button: null,
	/*
	 * onTrack of tracker API.
	 */
	onTrack: function (window) {
		// Check download window
		if (window.location != "chrome://mozapps/content/downloads/unknownContentType.xul")
			return;
		/*
		 * Retrieve download path.
		 */
		// Save download URL
		downloadUrl = window.dialog.mLauncher.source.spec;
		// Get default download path
		var downloadDomain = pathHistory.getDomain(downloadUrl);
		var defaultDownloadPath = pathHistory.get(downloadDomain);
		// Save download path
		downloadPath = defaultDownloadPath;
		// Get browser button label
		var defaultDownloadPathName = pathHistory.decodePath(defaultDownloadPath);
		var buttonLabel = "Dans" + (defaultDownloadPath === "" ? "…" : (" " + defaultDownloadPathName));
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
		// Create inner hbox element
		var innerHboxElement = window.document.createElement("hbox");
		innerHboxElement.setAttribute("flex", "1");
		innerHboxElement.setAttribute("align", "center");
		// Create button element
		var buttonElement = window.document.createElement("button");
		buttonElement.setAttribute("flex", "1");
		buttonElement.setAttribute("align", "left");
		buttonElement.setAttribute("label", buttonLabel);
		buttonElement.onclick = function () {
			// Open browser panel on default download path
			browserPanel.open(defaultDownloadPath);
		};
		// Append button element to inner hbox element
		innerHboxElement.appendChild(buttonElement);
		// Save button reference
		windowTrackerDelegate.button = buttonElement; 
		// Create hbox element
		var hboxElement = window.document.createElement("hbox");
		hboxElement.setAttribute("flex", "1");
		// Append freebox radio element to hbox element
		hboxElement.appendChild(freeboxElement);
		// Append inner hbox element to hbox element
		hboxElement.appendChild(innerHboxElement);
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
			if (freeboxElement.selected) {
				// Add download path to history
				if (downloadPath!==null)
					pathHistory.add(downloadDomain, downloadPath);
				// Check freebox download add task
				return freebox.downloads.add(downloadUrl, downloadPath);
			}
			// Otherwise, delegate to old behavior
			return window.dialog.oldOnOK();
		}
	},
	/*
	 * onUnTrack of tracker API.
	 */
	onUntrack: function (window) {
	}
};
// Include deprecated window-utils
var WinUtils = require("window-utils");
// Register window tracker delegate
var tracker = new WinUtils.WindowTracker(windowTrackerDelegate);

/*
 * Create application widget.
 */
var appWidget = Widget.Widget({
	id: "freebox_os_widget",
	label: app_name,
	contentURL: Self.data.url("images/freebox.png")
});

/*
 * Create connection panel.
 */
// Create connection panel
var connectionPanel = Panel.Panel({
	width: 400,
	height: 60,
	position: {
		top: 0,
		rigth: 100
	},
	contentURL: Self.data.url("html/connection.html"),
	contentScriptFile: Self.data.url("html/connection.js")
});
// Create connection panel API
connectionPanel.setStep = function (currentStep, lastStep) {
	connectionPanel.port.emit("set-step", currentStep + " / " + lastStep);
};
connectionPanel.setStatus = function (status, type) {
	connectionPanel.port.emit("set-status", status, type);
	if (type == "error" && !connectionPanel.isShowing)
		connectionPanel.show();
};

/*
 * Create browser panel.
 */
// Create browser panel
var browserPanel = Panel.Panel({
	width: 600,
	height: 400,
	contentURL: Self.data.url("html/browser.html"),
	contentScriptFile: Self.data.url("html/browser.js")
});
// Create connection panel API
browserPanel.open = function (path) {
	// Call ls on path recursively up to root
	freebox.fs.ls(path, function (path, content) {
		browserPanel.lsRecursiveCallback(path, content, new Array());
	}, true);
};
browserPanel.lsRecursiveCallback = function (path, content, stack) {
	// Check content
	if (content.length < 2)
		return;
	// Append result to stack
	stack.push({
		path: path,
		content: content
	});
	if (content[0].path === content[1].path) {
		// Notify panel of tree result
		for (var index = stack.length-1; index>=0; index--) {
			// Notify panel of result
			var result = stack[index];
			browserPanel.port.emit("ls", result.path, result.content);
		}
		// Display panel
		browserPanel.show();
		// End recursion
		return;
	} 
	// Call ls on parent folder
	freebox.fs.ls(content[1].path, function (path, content) {
		browserPanel.lsRecursiveCallback(path, content, stack);
	}, true);
};
browserPanel.lsCallback = function (path, content) {
	browserPanel.port.emit("ls", path, content);
};
browserPanel.port.on("ls", function (path) {
	freebox.fs.ls(path, browserPanel.lsCallback, true);
});
browserPanel.port.on("select", function (path) {
	// Save selected path
	downloadPath = path;
	// Update browser button label
	if (windowTrackerDelegate.button !== null) {
	var downloadPathName = pathHistory.decodePath(downloadPath);
		windowTrackerDelegate.button.setAttribute("label", "Dans " + downloadPathName);
	}
	// Close panel
	browserPanel.hide();
});
browserPanel.port.on("cancel", function () {
	// Close panel
	browserPanel.hide();
});
browserPanel.port.on("dump", function (variable, filter) {
	AnonXhr.dump(variable, filter);
});

/*
 * Initialize freebox OS application.
 */
var discoverCallback = function (found) {
	// Ensure freebox OS is found
	if (!found) {
		// Notify user of not found freebox
		connectionPanel.setStatus("Impossible de trouver la Freebox.", "error");
		// Stop initialization
		return;
	}
	// Update connection step
	connectionPanel.setStep(2, 5);
	// Authorize application
	freebox.login.authorize(authorizeCallback);
};
var authorizeCallback = function (track_id) {
	// Update connection step
	connectionPanel.setStep(3, 5);
	// Track authorization progress 
	freebox.login.authorizeTrack(track_id, authorizeTrackCallback);
};
var authorizeTrackCallback = function (status) {
	// Check status
	if (status == "granted") {
		// Update connection step
		connectionPanel.setStep(3, 5);
		// Get a challenge to log application
		freebox.login.login(loginCallback);
	} else if (status == "pending") {
		// Notify user to accept authorization
		connectionPanel.setStatus("Merci d'autoriser l'application depuis la façade de la Freebox.", "info");
		// Ensure connection panel is shown
		connectionPanel.show();
		// Delay next check
		Timers.setTimeout(function () {
			authorizeCallback(track_id)
		}, 2000);
	} else if (status == "unknown" || status == "timeout" || status == "denied") {
		// Notify user authorization failed
		connectionPanel.setStatus("L'extension n'a pas été autorisée.", "error");
		// Clear application authorization
		freebox.login.clear();
		// Notify freebox OS discovery
		// discoverCallback(true);	// TODO Enable
	}
};
var loginCallback = function (challenge) {
	// Update connection step
	connectionPanel.setStep(4, 5);
	// Log application with the given challenge
	freebox.login.session(challenge, sessionCallback);
};
var sessionCallback = function (sessionOpened, errorCode) {
	// Check session opened
	if (sessionOpened) {
		// Update connection step
		connectionPanel.setStep(5, 5);
		// Update connection status
		connectionPanel.setStatus("Connecté à la Freebox server.", "success");
	} else {
		// Check error code
		if (errorCode == "auth_required" || errorCode == "invalid_token") {
			// Clear application authorization
			freebox.login.clear();
			// Notify freebox OS discovery
			// discoverCallback(true);	// TODO Enable
			// return;
		}
		// Update connection status
		connectionPanel.setStatus("Merci de vérifier l'autorisation de l'extension (" + errorCode + ").", "error");
	}
}
// Initialize connection panel
connectionPanel.setStep(1, 5);
connectionPanel.setStatus("Connection en cours...", "info");
// Start freebox OS discovery
Timers.setTimeout(function () {
	freebox.discover(discoverCallback)
}, 1000);
