'use strict';

// Include modules
const Base64 = require('sdk/base64');
const Notifications = require('sdk/notifications');
const Panel = require('sdk/panel');
const Request = require('sdk/request').Request;
const SimplePrefs = require('sdk/simple-prefs');
const SimpleStorage = require('sdk/simple-storage');
const Self = require('sdk/self');
const Tabs = require('sdk/tabs');
const Timers = require('sdk/timers');
const Ui = require('sdk/ui');
// Include CryptoJS library
const CryptoJS = require('./lib/hmac-sha1').CryptoJS;
// Include Dump module
const Dump = require('./lib/rdump');
// Include Location Manager module
const LocationManager = require('./lib/location-manager');

// Declare application constants
const app_id = 'fr.hardcoding.firefox.freeboxos';
const app_name = 'Freebox OS for Firefox';
const app_version = '0.4';
const device_name = 'Workstation';
// Declare application authentication statuses
let app_token = null;
let track_id = null;
let session_token = null;
// Declare download variables
let downloadUrl = null;
let downloadLocation = null;
// Declare magnet tab worker collection
let magnetTabWorkers = [];

/*
 * Freebox API.
 */
let freebox = {
	api_version: null,
	api_base_url: null,

	/*
	 * Discovery module.
	 */
	discover: function(callback) {
		// Send discover request
		Request({
			anonymous: true,
			url: 'http://mafreebox.freebox.fr/api_version',
			onComplete: function(response) {
				// Check response json data
				if (response.json) {
					// Save API version and API base URL
					freebox.api_version = response.json.api_version;
					freebox.api_base_url = response.json.api_base_url;
					// Notify callback freebox OS found
					callback(true);
				} else {
					console.warn('Freebox OS not found.');
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
		authorize: function(callback) {
			// Check storage for authorization
			if (SimpleStorage.storage.app_token && SimpleStorage.storage.track_id) {
				// Restore application token and track id from simple storage
				app_token = Base64.decode(SimpleStorage.storage.app_token);
				track_id = SimpleStorage.storage.track_id;
				console.log('Authorization restored with track id: ' + track_id);
				// Notify callback with track_id
				callback(track_id);
				return;
			}
			// Create request content
			let content = JSON.stringify({
				app_id: app_id,
				app_name: app_name,
				app_version: app_version,
				device_name: device_name
			});
			// Send authorize request
			let authorizeRequest = Request({
				anonymous: true,
				url: 'http://mafreebox.freebox.fr/api/v3/login/authorize/',
				content: content,
				onComplete: function(response) {
					// Check response json data
					if (response.json) {
						// Check response success status
						if (response.json.success) {
							// Save app_token and track_id
							app_token = response.json.result.app_token;
							track_id = response.json.result.track_id;
							// Store app_token and track_id to storage
							SimpleStorage.storage.app_token = Base64.encode(app_token);
							SimpleStorage.storage.track_id = track_id;
							console.log('Application token retrieved.');
							// Notify callback with track_id
							callback(track_id);
						} else {
							console.warn('Application was not authorized.');
						}
					} else {
						console.warn('Unable to authorize application.');
					}
				}
			}).post();
		},
		/*
		 * Track authorization progress.
		 */
		authorizeTrack: function(track_id, callback) {
			// Send track authorization status
			Request({
				anonymous: true,
				url: 'http://mafreebox.freebox.fr/api/v3/login/authorize/' + track_id,
				onComplete: function(response) {
					// Check response json data
					if (response.json && response.json.success === true) {
						// Get status
						let status = response.json.result.status;
						console.log('Current track status: ' + status);
						// Notify callback with status
						callback(status);
					} else {
						console.warn('Unable to track authorization.');
					}
				}
			}).get();
		},
		/*
		 * Clear authorization.
		 */
		clear: function() {
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
			// Send login request
			Request({
				anonymous: true,
				url: 'http://mafreebox.freebox.fr/api/v3/login/',
				onComplete: function(response) {
					// Check response json data
					if (response.json && response.json.success === true) {
						// Return challenge
						callback(response.json.result.challenge);
					} else {
						console.warn('Unable to login.');
					}
				}
			}).get();
		},
		/*
		 * Open a session.
		 */
		session: function(challenge, callback) {
			// Create request content
			let content = JSON.stringify({
				app_id: app_id,
				password: '' + CryptoJS.HmacSHA1(challenge, app_token)
			});
			// Send login request
			Request({
				anonymous: true,
				url: 'http://mafreebox.freebox.fr/api/v3/login/session/',
				content: content,
				onComplete: function(response) {
					// Check response json data
					if (response.json) {
						// Check session opening success
						if (response.json.success === true) {
							// Save session token
							session_token = response.json.result.session_token;
							console.log('Logged in with session token: ' + session_token);
							// console.log('Current permissions:');
							// for (let key in response.json.result.permissions)
							// console.log(key + ': ' + response.json.result.permissions[key]);
							// Notify callback
							callback(true);
						} else {
							// Notify callback
							callback(false, response.json.error_code);
						}
					} else {
						console.warn('Unable to open session.');
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
		add: function(url, path) {
			console.log('Link: ' + url);
			// Check session token
			if (session_token === null)
				return false;
			// Create and send download add request
			Request({
				anonymous: true,
				url: 'http://mafreebox.freebox.fr/api/v3/downloads/add',
				headers: {
					'X-Fbx-App-Auth': session_token
				},
				content: {
					download_url: url,
					download_dir: path
				},
				onComplete: function(response) {
					// Check response json success status
					if (response.json && response.json.success === true) {
						console.info('Download added.');
						// Notify user
						Notifications.notify({
							title: 'Freebox server',
							text: 'Le téléchargement a été ajouté.',
							iconURL: Self.data.url('images/download.png')
						});
					} else if (response.status === 403) {
						// Try to handle error
						handleError(response.json, function() {
							freebox.downloads.add(url, path);
						});
					} else {
						console.warn('Unable to add download.');
					}
				}
			}).post();
			// Return as successful
			return true;
		},
		/*
		 * List all download tasks.
		 */
		list: function(callback) {
			// Check session token
			if (session_token === null)
				return false;
			// Create and send download list request
			Request({
				anonymous: true,
				url: 'http://mafreebox.freebox.fr/api/v3/downloads/',
				headers: {
					'X-Fbx-App-Auth': session_token
				},
				onComplete: function(response) {
					// Check response json success status
					if (response.json && response.json.success === true) {
						// Send result to callback
						callback(response.json.result);
					} else if (response.status === 403) {
						// Try to handle error
						handleError(response.json, function() {
							freebox.downloads.list(callback);
						});
					} else {
						console.warn('Unable to list downloads.');
					}
				}
			}).get();
		}
	},

	/*
	 * File system module.
	 */
	fs: {
		/*
		 * List content of a path.
		 */
		ls: function(path, callback, onlyFolder) {
			// Check session token
			if (session_token === null)
				return false;
			// Create and send fs ls request
			Request({
				anonymous: true,
				url: 'http://mafreebox.freebox.fr/api/v3/fs/ls/' + path,
				headers: {
					'X-Fbx-App-Auth': session_token
				},
				content: {
					onlyFolder: onlyFolder === true ? '1' : '0'
				},
				onComplete: function(response) {
					if (response.json && response.json.success === true) {
						// Notify callback
						callback(path, response.json.result);
					} else if (response.status === 403) {
						// Try to handle error
						handleError(response.json, function() {
							freebox.fs.ls(path, callback, onlyFolder)
						});
					} else {
						console.warn('Unable to list files.');
					}
				}
			}).get();
			// Return as successful
			return true;
		},
		/*
		 * Create a directory.
		 */
		mkdir: function(parent, dirname) {
			// Check session token
			if (session_token === null)
				return false;
			// Create request content
			let content = JSON.stringify({
				parent: parent,
				dirname: dirname
			});
			// Create and send mkdir request
			Request({
				anonymous: true,
				url: 'http://mafreebox.freebox.fr/api/v3/fs/mkdir/',
				headers: {
					'X-Fbx-App-Auth': session_token
				},
				content: content,
				onComplete: function(response) {
					// Check response json success status
					if (response.json && response.json.success === true) {
						console.info('Directory ' + dirname + ' created.');
					} else if (response.status === 403) {
						// Try to handle error
						handleError(response.json, function() {
							freebox.fs.mkdir(parent, dirname)
						});
					} else {
						console.warn('Unable to create directory ' + dirname + '.');
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
let windowTrackerDelegate = {
	/*
	 * onTrack of tracker API.
	 */
	onTrack: function(window) {
		// Check download window
		if (window.location.href !== 'chrome://mozapps/content/downloads/unknownContentType.xul') {
			return;
		}
		/*
		 * Retrieve download path.
		 */
		// Save download URL
		downloadUrl = window.dialog.mLauncher.source.spec;
		// Get download location and label
		let downloadLocation = LocationManager.get(downloadUrl);
		let downloadLocationLabel = '';
		// Check always use path
		if (downloadLocation.always) {
			// Set download location
			downloadLocationLabel = LocationManager.decodePath(downloadLocation.path);
			if (downloadLocationLabel === '') {
				downloadLocationLabel = ' à la racine';
			} else {
				downloadLocationLabel = ' dans ' + downloadLocationLabel;
			}
		}
		/*
		 * Edit XUL window.
		 */
		// Get mode radiogroup element
		let modeElement = window.document.getElementById('mode');
		// Get save radio element
		let saveElement = window.document.getElementById('save');
		// Create freebox radio element
		let freeboxElement = window.document.createElement('radio');
		freeboxElement.setAttribute('id', 'freebox');
		freeboxElement.setAttribute('label', 'Envoyer sur la Freebox' + downloadLocationLabel);
		// Create hbox element
		let hboxElement = window.document.createElement('hbox');
		hboxElement.setAttribute('flex', '1');
		// Append freebox radio element to hbox element
		hboxElement.appendChild(freeboxElement);
		// Insert hbox element into mode radiogroup element
		modeElement.insertBefore(hboxElement, saveElement);
		/*
		 * Edit XUL behavior.
		 */
		// Get window element
		let windowElement = window.document.getElementById('unknownContentType');
		// Get current validation script
		let currentValidation = windowElement.getAttribute('ondialogaccept');
		// Save old validation behavior
		window.dialog.oldOnOK = window.dialog.onOK;
		// Define new validation behavior
		window.dialog.onOK = function() {
			// Ensure freebox radio element is selected
			if (freeboxElement.selected) {
				// Check if location is already defined and always used
				if (downloadLocation !== null && downloadLocation.always) {
					// Save last path to the manager
					LocationManager.setLastPath(downloadLocation.path);
					// Check freebox download add task
					return freebox.downloads.add(downloadUrl, downloadLocation.path);
				}
				// Open browser panel
				Timers.setTimeout(function() {
					browserPanel.open(downloadLocation, function(location) {
						// Save download location
						downloadLocation = location;
						// Check the location strategy
						if (SimplePrefs.prefs.locationStrategy === 'learn') {
							// Add the location to the manager
							LocationManager.save(downloadUrl, location);
						}
						// Save last path to the manager
						LocationManager.setLastPath(location.path);
						// Add the download
						freebox.downloads.add(downloadUrl, downloadLocation.path);
					});
				}, 500);
				// Validate dialog
				return true;
			}
			// Otherwise, delegate to old behavior
			return window.dialog.oldOnOK();
		}
	},
	/*
	 * onUnTrack of tracker API.
	 */
	onUntrack: function(window) {}
};
// Include deprecated window-utils
const WinUtils = require('sdk/deprecated/window-utils');
// Register window tracker delegate
const tracker = new WinUtils.WindowTracker(windowTrackerDelegate);

/*
 * Create application action button.
 */
// Create action button
let actionButton = Ui.ActionButton({
	id: 'freebox-os-button',
	label: app_name,
	icon: Self.data.url('images/freebox.png'),
	onClick: function() {
		// Declare if tab was found
		let foundTab = false;
		// Check each opened tab
		for (let tab of Tabs) {
			// Check tab URL
			if (tab.url.startsWith('http://mafreebox.freebox.fr')) {
				// Mark tab as found
				foundTab = true;
				// activate the found tab
				tab.activate();
				// Stop looking for tab
				break;
			}
		}
		// Check if a tab was found
		if (!foundTab) {
			// Open a new tab to downloader application
			Tabs.open('http://mafreebox.freebox.fr/#Fbx.os.app.downloader.app');
		}
	}
});
// Create action button API
actionButton.startEtaUpdate = function(delay) {
	// Check if ETA update delay differs
	if (delay === actionButton.etaUpdateDelay) {
		return;
	}
	// Update ETA update delay
	actionButton.etaUpdateDelay = delay;
	// Check current ETA update timer
	if (actionButton.etaUpdateTimer !== null) {
		// Cancel current timer
		Timers.clearInterval(actionButton.etaUpdateTimer);
	}
	// Start new timer
	actionButton.etaUpdateTimer = Timers.setInterval(function() {
		freebox.downloads.list(actionButton.etaUpdateCallback)
	}, delay);
}
actionButton.stopEtaUpdate = function() {
		// Check current ETA update timer
		if (actionButton.etaUpdateTimer !== null) {
			// Cancel current timer
			Timers.clearInterval(actionButton.etaUpdateTimer);
		}
		// Reset ETA update delay and timer
		actionButton.etaUpdateDelay = -1;
		actionButton.etaUpdateTimer = null;
	}
	// Create callback for freebox download list API
actionButton.etaUpdateCallback = function(downloads) {
		// Declare max ETA
		let maxEta = 0;
		// Check each download
		for (let i = 0; i < downloads.length; i++) {
			// Check download status
			if (downloads[i].status !== 'downloading')
				continue;
			// Get download ETA
			let eta = downloads[i].eta;
			// Check max ETA
			if (eta > maxEta) {
				// Update max ETA
				maxEta = eta;
			}
		};
		// Check max ETA to display it
		if (maxEta === 0) {
			// Hide ETA
			actionButton.badge = '';
		} else if (maxEta < 60) {
			// Display remaining seconds
			actionButton.badge = maxEta + 's';
		} else if (maxEta < 3600) {
			// Display remaining minutes
			actionButton.badge = Math.ceil(maxEta / 60) + 'm';
		} else {
			// Check hours lefts
			let hours = Math.floor(maxEta / 3600);
			if (hours > 9) {
				// Only display hours
				actionButton.badge = hours + 1 + 'h';
			} else {
				// Display hours and minutes
				let minutes = Math.ceil((maxEta % 3600) / 60);
				actionButton.badge = hours + 'h' + minutes;
			}
		}
		// Declare new update delay
		let etaUpdateDelay;
		// Check max ETA
		if (maxEta === 0) {
			// Increase ETA update delay to 10 seconds
			etaUpdateDelay = 10000;
		} else if (maxEta > 300) {
			// Tune ETA update delay to 5 seconds if more than 5 minutes left
			etaUpdateDelay = 5000;
		} else {
			// Tune ETA update time to 1 second if downloads ends in the next 5 minutes
			etaUpdateDelay = 1000;
		}
		// Update ETA update delay
		actionButton.startEtaUpdate(etaUpdateDelay);
	}
	// Initialize ETA update mechanism
actionButton.stopEtaUpdate();

/*
 * Create connection panel.
 */
// Create connection panel
let connectionPanel = Panel.Panel({
	width: 400,
	height: 60,
	position: {
		top: 0,
		rigth: 100
	},
	contentURL: Self.data.url('html/connection.html'),
	contentScriptFile: Self.data.url('html/connection.js')
});
// Create connection panel API
connectionPanel.setStep = function(currentStep, lastStep) {
	connectionPanel.port.emit('set-step', currentStep + ' / ' + lastStep);
};
connectionPanel.setStatus = function(status, type, forceShowing) {
	connectionPanel.port.emit('set-status', status, type);
	if (forceShowing && !connectionPanel.isShowing) {
		connectionPanel.show({
			position: actionButton
		});
	}
};

/*
 * Create browser panel.
 */
// Create browser panel
let browserPanel = Panel.Panel({
	width: 600,
	height: 400,
	contentURL: Self.data.url('html/browser.html'),
	contentScriptFile: Self.data.url('html/browser-content.js')
});
// Create connection panel API
browserPanel.open = function(location, callback) {
	// Store callback
	browserPanel.callback = callback;
	// Call ls on path recursively up to root
	freebox.fs.ls(location.path, function(path, content) {
		browserPanel.lsRecursiveCallback(path, content, new Array(), location.always);
	}, true);
};
browserPanel.lsRecursiveCallback = function(path, content, stack, remember) {
	// Check content
	if (content.length < 2)
		return;
	// Append result to stack
	stack.push({
		path: path,
		content: content
	});
	// Check if path is root
	if (content[0].path === content[1].path) {
		// Clear previous tree
		browserPanel.port.emit('clear');
		// Notify panel of tree result
		for (let index = stack.length - 1; index >= 0; index--) {
			// Notify panel of result
			let result = stack[index];
			browserPanel.port.emit('render', result.path, result.content);
			// Check last path to select
			if (index === 0) {
				// Show last past
				browserPanel.port.emit('show', result.path, remember);
			}
		}
		// Display panel
		browserPanel.show();
		// End recursion
		return;
	}
	// Call ls on parent folder
	freebox.fs.ls(content[1].path, function(path, content) {
		browserPanel.lsRecursiveCallback(path, content, stack, remember);
	}, true);
};
browserPanel.lsCallback = function(path, content) {
	browserPanel.port.emit('render', path, content);
};
browserPanel.port.on('ls', function(path) {
	freebox.fs.ls(path, browserPanel.lsCallback, true);
});
browserPanel.port.on('mkdir', function(parent, dirname) {
	freebox.fs.mkdir(parent, dirname);
});
browserPanel.port.on('select', function(path, remember) {
	// Close panel
	browserPanel.hide();
	// Check callback
	if (typeof browserPanel.callback === 'function') {
		// Declare location
		let location = {
			'path': path,
			'always': remember
		};
		// Call the callback
		browserPanel.callback(location);
		// Remove the callback
		delete browserPanel.callback;
	}
});
browserPanel.port.on('cancel', function() {
	// Close panel
	browserPanel.hide();
});
browserPanel.port.on('dump', function(variable, filter) {
	Dump.dump(variable, filter);
});
// Bind the browser panel opening on preferences control
SimplePrefs.on('defaultLocationControl', function() {
	// Get default location
	let defaultLocation = {
		'path': SimplePrefs.prefs.defaultLocation,
		'always': true
	};
	// Open the browser panel
	browserPanel.open(defaultLocation, function(location) {
		// Save default location
		SimplePrefs.prefs.defaultLocation = location.path;
	});
});

/*
 * Create locations panel.
 */
// Create locations panel
let locationsPanel = Panel.Panel({
	width: 800,
	height: 600,
	contentURL: Self.data.url('html/locations.html'),
	contentScriptFile: Self.data.url('html/locations-content.js')
});
// Create loaction panel API
locationsPanel.open = function() {
	// Get all paths from location manager
	let paths = LocationManager.getAll();
	// Decode all paths to locations
	let locations = {};
	for (let domain in paths) {
		locations[domain] = {
			path: LocationManager.decodePath(paths[domain].path),
			always: paths[domain].always
		};
	}
	// Send locations to panel
	locationsPanel.port.emit('display', locations);
	// Display panel
	locationsPanel.show();
};
locationsPanel.port.on('edit', function(domain) {
	// Get location for edited domain
	let location = LocationManager.getAll()[domain];
	if (typeof location === 'undefined') {
		return;
	}
	// Open browser panel
	browserPanel.open(location, function(location) {
		// Update the path for the domain
		LocationManager.save('http://' + domain, location);
		// Re-open the location panel
		locationsPanel.open();
	});
});
locationsPanel.port.on('delete', function(domain) {
	// Remove path for domain
	LocationManager.remove(domain);
});
// Bind the location panel opening on preferences control
SimplePrefs.on('locations', function() {
	// Open the location panel
	locationsPanel.open();
});

/*
 * Create magnet link handler.
 */
// Add listener on tab page loading
Tabs.on('ready', function(tab) {
	// Check magnet scheme
	if (tab.url.indexOf('magnet:') !== 0)
		return;
	// Save download URL
	downloadUrl = tab.url;
	// Check download path initialization
	if (downloadLocation === null)
		downloadLocation = {
			path: '',
			always: false
		};
	// Decode download location label
	let downloadLocationLabel = LocationManager.decodePath(downloadLocation.path);
	// Attach content script
	let worker = tab.attach({
		contentScriptFile: Self.data.url('html/magnet-content.js')
	});
	// Add worker to magnet tab worker collection
	magnetTabWorkers.push(worker);
	// Send current magnet link
	worker.port.emit('download', downloadUrl);
	// Send current download location label
	worker.port.emit('pwd', downloadLocationLabel);
	// Send icon resources
	worker.port.emit('icon', Self.data.url('images/freebox.png'), Self.data.url('images/download.png'));
	// Add worker message listeners
	worker.port.on('browse', function() {
		// Check download path
		browserPanel.open(downloadLocation, function(location) {
			// Save download location
			downloadLocation = location;
			// Decode download location label
			let downloadLocationLabel = LocationManager.decodePath(downloadLocation.path);
			// Update magnet pages
			for (let index in magnetTabWorkers) {
				// Get magnet tab worker
				let magnetTabWorker = magnetTabWorkers[index];
				// Check if worker is always valid
				if (magnetTabWorker.tab === null) {
					// Remove the worker from collection
					magnetTabWorkers.splice(index, 1);
					continue;
				}
				// Notify worker of current download location label
				magnetTabWorker.port.emit('pwd', downloadLocationLabel);
			}
		});
	});
	worker.port.on('download', function(downloadUrl) {
		// Save last path to the manager
		LocationManager.setLastPath(downloadLocation.path);
		// Add freebox download add task
		freebox.downloads.add(downloadUrl, downloadLocation.path, false);
	});
});

/*
 * Initialize freebox OS application.
 */
let discoverCallback = function(found) {
	// Ensure freebox OS is found
	if (!found) {
		// Notify user of not found freebox
		connectionPanel.setStatus('Impossible de trouver la Freebox.', 'error', true);
		// Stop initialization
		return;
	}
	// Update connection step
	connectionPanel.setStep(2, 5);
	// Authorize application
	freebox.login.authorize(authorizeCallback);
};
let authorizeCallback = function(track_id) {
	// Update connection step
	connectionPanel.setStep(3, 5);
	// Track authorization progress
	freebox.login.authorizeTrack(track_id, authorizeTrackCallback);
};
let authorizeTrackCallback = function(status) {
	// Check status
	if (status === 'granted') {
		// Update connection step
		connectionPanel.setStep(3, 5);
		// Get a challenge to log application
		freebox.login.login(loginCallback);
	} else if (status === 'pending') {
		// Notify user to accept authorization
		connectionPanel.setStatus('Merci d\'autoriser l\'application depuis la façade de la Freebox.', 'info', true);
		// Delay next check
		Timers.setTimeout(function() {
			authorizeCallback(track_id)
		}, 2000);
	} else if (status === 'unknown' || status === 'timeout' || status === 'denied') {
		// Notify user authorization failed
		connectionPanel.setStatus('L\'extension n\'a pas été autorisée.', 'error', true);
		// Clear application authorization
		freebox.login.clear();
		// Notify freebox OS discovery
		discoverCallback(true);
	}
};
let loginCallback = function(challenge) {
	// Update connection step
	connectionPanel.setStep(4, 5);
	// Log application with the given challenge
	freebox.login.session(challenge, sessionCallback);
};
let sessionCallback = function(sessionOpened, errorCode) {
		// Check session opened
		if (sessionOpened) {
			// Update connection step
			connectionPanel.setStep(5, 5);
			// Update connection status
			connectionPanel.setStatus('Connecté à la Freebox server.', 'success', false);
			// Initialije ETA update
			actionButton.startEtaUpdate(10000);
		} else {
			// Check error code
			if (errorCode == 'auth_required' || errorCode == 'invalid_token') {
				// Clear application authorization
				freebox.login.clear();
				// Notify freebox OS discovery
				// discoverCallback(true);	// TODO Enable
				// return;
			}
			// Update connection status
			connectionPanel.setStatus('Merci de vérifier l\'autorisation de l\'extension (' + errorCode + ').', 'error', true);
		}
	}
	// Initialize connection panel
connectionPanel.setStep(1, 5);
connectionPanel.setStatus('Connection en cours...', 'info', false);
// Start freebox OS discovery
Timers.setTimeout(function() {
	freebox.discover(discoverCallback)
}, 1000);

/*
 * Create reconnection mechanism to cover challenge change.
 */
let handleError = function(json, call) {
	// Check error code
	if (json.error_code === 'auth_required') {
		// Log application with the given challenge
		freebox.login.session(json.result.challenge, function(sessionOpened, errorCode) {
			// Check if session is reopened
			if (!sessionOpened) {
				console.warn('Unable to reconnect application.');
				return;
			}
			// Repeat call with delay
			Timers.setTimeout(function() {
				call();
			}, 500);
		});
	} else if (json.error_code === 'invalid_token') {
		// Clear application authorization
		freebox.login.clear();
		// Notify freebox OS discovery
		discoverCallback(true);
	} else {
		// Log untreated error case
		console.warn('Unable to handle error: ' + json.error_code);
		console.dir(json);
	}
}
