/*
 * Create message reception from main.js.
 */
// Create display message receiver
self.port.on('display', function (locations) {
	// Send a message to page script to display locations
	document.defaultView.postMessage({
		action: 'display',
		locations: locations
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
	// Check edit action
	if (event.data.action === 'edit' && typeof event.data.site === 'string') {
		// Send edit message to main.js
		self.port.emit('edit', event.data.site);
		return;
	}
	// Check delete action
	if (event.data.action === 'delete' && typeof event.data.site === 'string') {
		// Send delete message to main.js
		self.port.emit('delete', event.data.site);
		return;
	}
}, false);