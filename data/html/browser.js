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
	 * Format the file system.
	 */
	format: function () {
		this.root = {};
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
		path: selectedPath,
		remember: w2ui['controls'].get('remember').checked
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
 * Display UI to create directory.
 */
var mkdir = function () {
	// Hide default toolbar element for directory creation
	w2ui['controls'].hide('mkdir');
	// Show toolbar elements for directory creation
	w2ui['controls'].show('mkdir-name');
	w2ui['controls'].show('mkdir-confirm');
	w2ui['controls'].show('mkdir-cancel');
	// Request focus on input field
	$('#mkdir-name').focus();
}

/*
 * Hide UI to create directory.
 */
var mkdirCancel = function () {
	// Reset directory name
	$('#mkdir-name').val('');
	// Hide toolbar elements for directory creation
	w2ui['controls'].hide('mkdir-name');
	w2ui['controls'].hide('mkdir-confirm');
	w2ui['controls'].hide('mkdir-cancel');
	// Show default toolbar element for directory creation
	w2ui['controls'].show('mkdir');
};

/*
 * Create a directory.
 */
var mkdirConfirm = function () {
	// Get selected path
	var selectedPath = w2ui.fileSystem.selected;
	if (selectedPath === '')
		return;
	// Get directory name
	var dirname = $('#mkdir-name').val();
	// Send add-on message to create directory
	window.postMessage({
		action: 'mkdir',
		parent: selectedPath,
		dirname: dirname
	}, '*');
	// Hide UI to create directory
	mkdirCancel();
	// Update selected path content
	explore(selectedPath);
};

/*
 * Create message reception.
 */
// Create message receiver
window.addEventListener('message', function(event) {
	// Check event data action
	if (typeof event.data.action === undefined)
		return;
	// Check clear action
	if (event.data.action === 'clear') {
		// Format current file system
		fileSystem.format();
		// Remove each entry of the file system explorer
		for (var index in w2ui.fileSystem.nodes) {
			var node = w2ui.fileSystem.nodes[index];
			w2ui.fileSystem.remove(node.id);
		}
	}
	// Check render action
	else if (event.data.action === 'render') {
		// Get path and content to render
		var path = event.data.path;
		var content = event.data.content;
		// Add content to file system
		fileSystem.add(path, content);
		// Render path
		buildExplorer(path);
	}
	// Check show action
	else if (event.data.action === 'show' && typeof event.data.path === 'string') {
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
				id: 'mkdir',
				caption: 'Nouveau dossier',
				img: 'icon-folder',
				hint: 'Créer un nouveau dossier'
			},
			{
				type: 'html',
				id: 'mkdir-name',
				html: '<div style="padding: 3px 10px;">Nom : <input id="mkdir-name" size="10" style="padding: 3px; border-radius: 2px; border: 1px solid silver"/></div>',
				hidden: true
			},
			{
				type: 'button',
				id: 'mkdir-confirm',
				caption: 'Créer',
				img: 'icon-folder',
				hint: 'Créer le nouveau dossier',
				hidden: true
			},
			{
				type: 'button',
				id: 'mkdir-cancel',
				caption: 'Annuler',
				img: 'icon-delete',
				hint: 'Annuler la création',
				hidden: true
			},
			{
				type: 'spacer'
			},
			{
				type: 'check',
				id: 'remember',
				caption: 'Mémoriser'
			},
			{
				type: 'break',
				id: 'break'
			},
			{
				type: 'button',
				id: 'cancel',
				caption: 'Annuler',
				img: 'icon-delete',
				hint: 'Annuler la sélection'
			},
			{
				type: 'button',
				id: 'select',
				caption: 'Sélectionner',
				img: 'icon-save',
				hint: 'Sélectionner le dossier de téléchargement'
			}
		],
		onClick: function (event) {
			// Check mkdir target
			if (event.target === 'mkdir') {
				// Display UI to create directory
				mkdir();
				return;
			}
			// Check mkdir-confirm target
			if (event.target === 'mkdir-confirm') {
				// Create directory
				mkdirConfirm();
				return;
			}
			// Check mkdir-cancel target
			if (event.target === 'mkdir-cancel') {
				// Hide UI to create directory
				mkdirCancel();
				return;
			}
			// Check cancel target
			if (event.target === 'cancel') {
				// Cancel panel
				cancel();
				return;
			}
			// Check select target
			if (event.target === 'select') {
				// Valid user selection
				valid();
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