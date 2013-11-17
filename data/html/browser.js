/*
 * The file system representation.
 */
var fileSystem = {
	/*
	 * The file system root.
	 * All files are flatten and indexed by encoded name.
	 */
	root: {},
	/*
	 * Add file to file system.
	 */
	add: function (path, content) {
		this.root[path] = content;
	},
	/*
	 * Get content of a file.
	 */
	get: function (path) {
		return this.root[path];
	},
	/*
	 * Compute depth of a path.
	 */
	computeDepth: function (path) {
		// Get content of the path
		var content = this.get(path);
		// Check if path contains at least two items (. and ..)
		if (content === undefined || content.length < 2 || content[1].name !== "..")
			return 0;
		// Check if . and .. are the same (ie root folder)
		if (content[0].path === content[1].path)
			return 0;
		// Return one level more than its parent
		return 1 + this.computeDepth(content[1]);
	}
};

/*
 * Build explorer.
 */
var buildExplorer = function (path) {
	// Get path content
	var directory = fileSystem.get(path);
	if (directory === undefined)
		return;
	// Build each path content element
	var nodes = new Array();
	for (var index in directory) {
		// Get path file
		var file = directory[index];
		// Skip hidden file
		if (file.hidden)
			continue;
		// Append file element
		nodes.push({
			id: file.path,
			text: file.name,
			img: 'icon-folder'
		});
	}
	// Get the depth of the path
	var depth = fileSystem.computeDepth(path);
	if (depth===0)
		// Add nodes on root node
		w2ui.fileSystem.add(nodes);
	else  {
		// Add nodes to parent node
		w2ui.fileSystem.add(path, nodes);
		// Expand parent node
		w2ui.fileSystem.expand(path);
	}
}

/*
 * Explore a path.
 */
var explore = function (path) {
	// Send a message to list content of a path
	window.postMessage({
		action: 'ls',
		path: path
	}, '*');
};

/*
 * Valid the selected path.
 */
var valid = function () {
	// Get selected path
	var selectedPath = w2ui.fileSystem.selected;
	if (selectedPath === '')
		return;
	// Send add-on message to select path
	window.postMessage({
		action: 'select',
		path: selectedPath
	}, '*');
};

/*
 * Cancel the dialog.
 */
var cancel = function () {
	// Send add-on message to close panel
	window.postMessage({
		action: 'cancel'
	}, '*');
};

/*
 * Create message reception.
 */
// Create render message receiver
window.addEventListener('message', function(event) {
	// Check event data action
	if (typeof event.data.action === undefined)
		return;
	// Check render action
	if (event.data.action === 'render') {
		// Get path and content to render
		var path = event.data.path;
		var content = event.data.content;
		// Add content to file system
		fileSystem.add(path, content);
		// Render path
		buildExplorer(path);
		return;
	}
	// Check show action
	if (event.data.action === 'show' && typeof event.data.path === 'string') {
		// Get related node
		var node = event.data.path;
		// Select the node
		w2ui.fileSystem.select(node);
		// Ensure the node is visible
		w2ui.fileSystem.scrollIntoView(node);
	}
}, false);

// Create browser panel configuration
var config = {
	// Create layout configuration
	layout: {
		name: 'explorer',
		panels: [
			{
				type: 'top',
				size: 30
			},
			{
				type: 'main'
			},
			{
				type: 'bottom',
				size: 30
			}
		]
	},
	// Create sidebar configuration
	sidebar: {
		name: 'fileSystem',
		img: null,
		nodes: [],
		onClick: function (event) {
			// Get clicked path
			var path = event.target;
			// Get clicked node
			var node = w2ui.fileSystem.get(path);
			// Check node children
			if (node.nodes.length == 0) {
				// Explore path
				explore(path);
			}
		}
	},
	// Create control bar configuration
	controlbar: {
		name: 'controls',
		items: [
			{
				type: 'button',
				id: 'select',
				caption: 'Sélectionner',
				hint: 'Sélectionner le dossier de téléchargement'
			},
			{
				type: 'button',
				id: 'cancel',
				caption: 'Annuler',
				hint: 'Annuler la sélection'
			}
		],
		onClick: function (event) {
			// Check select target
			if (event.target === 'select') {
				// Valid user selection
				valid();
				return;
			}
			// Check cancel target
			if (event.target === 'cancel') {
				// Cancel panel
				cancel();
				return;
			}
		}
	}
};

/*
 * Initialize browser panel.
 */
$(function () {
	// Create panel layout
	$('#fileSystem').w2layout(config.layout);
	// Add panel header
	w2ui.explorer.content('top', 'Explorer :');
	// Add panel file explorer
	w2ui.explorer.content('main', $().w2sidebar(config.sidebar));
	// Add panel controls
	w2ui.explorer.content('bottom', $().w2toolbar(config.controlbar));
});

var dump = function (variable) {
	for (var index in variable) {
		try {
			window.postMessage({
				action: 'dump',
				key: index,
				value: variable[index]
			}, '*');
		} catch (error) {
			window.postMessage({
				action: 'dump',
				key: index,
				value: 'not clonable'
			}, '*');
		}
	}
}