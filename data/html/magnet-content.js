// Declare download URL
var downloadUrl;
// Declare locales
var messageTitle = 'Télécharger le torrent';
var baseLocationMessage = 'Le torrent va être télécharger ';
var rootLocationMessage = 'à la racine';
var dirLocationMessage = 'dans ';

/*
 * Create main div style.
 */
function mainDivStyle(url) {
	return 'background: url("' + url +'") no-repeat scroll left 0px content-box border-box -moz-field;' +
	' position: relative;' +
	' min-width: 13em;' +
	' max-width: 52em;' +
	' margin: 4em auto;' +
	' padding: 3em;' +
	' -moz-padding-start: 30px;' +
	' border: 1px solid threedshadow;' +
	' border-radius: 10px;';
}

/*
 * Create message reception from main.js.
 */
// Create icon message receiver
self.port.on('icon', function (favicon, icon) {
	// TODO do not work for favicon
	// console.log('on icon ' + favicon + ' ' + icon + '.');
	// Get favicon link
	// var faviconLink = document.getElementById('favicon');
	// var head = faviconLink.parentNode;
	// faviconLink.type = 'image/x-icon';
	// faviconLink.rel = 'shortcut icon';
	// head.removeChild(faviconLink);
	// console.log(faviconLink.href);
	// // Update favicon
	// faviconLink.href = favicon;
	// console.log(faviconLink.href);
	// head.appendChild(faviconLink);
	// Get main div
	var mainDiv = document.getElementById('main');
	// Update icon
	mainDiv.style = mainDivStyle(icon);
});
// Create download message receiver
self.port.on('download', function (url) {
	// Save download URL
	downloadUrl = url;
});
// Create pwd message receiver
self.port.on('pwd', function (path) {
	// Get location div
	var locationDiv = document.getElementById('location');
	// Get location message
	var locationMessage = baseLocationMessage;
	if (path === '') {
		locationMessage+= rootLocationMessage;
	} else {
		locationMessage+= dirLocationMessage + path;
	}
	locationMessage+= '.';
	// Update location div content
	locationDiv.innerHTML = locationMessage;
});

/*
 * Create message reception from page script.
 */
document.defaultView.addEventListener('message', function (event) {
	// Check event data action
	if (typeof event.data.action === undefined)
		return;
	// Check browse action
	if (event.data.action === 'browse') {
		// Send browse message to main.js
		self.port.emit('browse');
		return;
	}
	// Check download action
	if (event.data.action === 'download' && downloadUrl !== null) {
		// Send download message to main.js
		self.port.emit('download', downloadUrl);
		return;
	}
}, false);

// Get title element
var title = document.getElementsByTagName('title')[0];
// Change title
title.innerHTML = messageTitle;
// Get body element
var body = document.getElementsByTagName('body')[0];
// Remove each body child element
while (body.hasChildNodes()) {
	body.removeChild(body.lastChild);
}
// Create and append main div element
var mainDiv = document.createElement('div');
mainDiv.id = 'main';
mainDiv.style = mainDivStyle('chrome://global/skin/icons/warning-large.png');
body.appendChild(mainDiv);
// Create and append title div element
var titleDiv = document.createElement('div');
titleDiv.style = '-moz-margin-start: 100px;';
mainDiv.appendChild(titleDiv);
// Create and append h1 element
var h1 = document.createElement('h1');
h1.innerHTML = messageTitle;
h1.style = 'margin: 0px 0px 0.6em;' +
	' border-bottom: 1px solid threedlightshadow;' +
	' font-size: 160%;';
titleDiv.appendChild(h1);
// Create and append content div element
var contentDiv = document.createElement('div');
contentDiv.style = '-moz-margin-start: 100px;';
mainDiv.appendChild(contentDiv);
// Create and append location p element
var locationP = document.createElement('p');
locationP.id = 'location';
locationP.innerHTML = baseLocationMessage + rootLocationMessage + '…';
locationP.style = 'font-size: 130%';
contentDiv.appendChild(locationP);
// Create and append browse button
var browseButton = document.createElement('button');
browseButton.type = 'button';
browseButton.innerHTML = 'Parcourrir';
browseButton.style = 'margin-top: 2em; -moz-margin-start: 100px;';
mainDiv.appendChild(browseButton);
// Add browse button listener
browseButton.addEventListener('click', function() {
	document.defaultView.postMessage({action: 'browse'}, '*');
}, false);
// Create and append download button
var downloadButton = document.createElement('button');
downloadButton.type = 'button';
downloadButton.innerHTML = 'Télécharger';
downloadButton.style = 'margin-top: 2em; margin-left: 40px;';
mainDiv.appendChild(downloadButton);
// Add download button listener
downloadButton.addEventListener('click', function() {
	document.defaultView.postMessage({action: 'download'}, '*');
}, false);