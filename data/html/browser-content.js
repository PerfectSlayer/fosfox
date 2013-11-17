/*
 * Create message reception from main.js.
 */
// Create render message receiver
self.port.on('render', function (path, content) {
	// Send a message to page script to render ls result
	document.defaultView.postMessage({
		action: 'render',
		path: path,
		content: content
	}, '*');
});
// Create select message receiver
self.port.on('show', function (path) {
	// Send a message to page script to show the path
	document.defaultView.postMessage({
		action: 'show',
		path: path
	}, '*');
});

/*
 * Create message reception from page script.
 */
// Create message receiver
window.addEventListener('message', function(event) {
	// Check event data action
	if (typeof event.data.action === undefined)
		return;
	// Check ls action
	if (event.data.action === 'ls' && typeof event.data.path === 'string') {
		// Send ls message to main.js
		self.port.emit('ls', event.data.path);
		return;
	}
	// Check select action
	if (event.data.action === 'select' && typeof event.data.path === 'string') {
		// Send select message to main.js
		self.port.emit('select', event.data.path);
		return;
	}
	// Check cancel action
	if (event.data.action === 'cancel') {
		// Send cancel message to main.js
		self.port.emit('cancel');
		return;
	}
	if (event.data.action === 'dump') {
		console.log(event.data.key + ' ' +event.data.value);
		return;
	}
}, false);