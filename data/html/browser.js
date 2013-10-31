
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

// The selected path
var selectedPath = null;

/*
 * Build explorer.
 */
var buildExplorer = function (path, depth) {
	// Get path content
	var directory = fileSystem.get(path);
	if (directory === undefined)
		return;
	// Get path identifier
	var id = depth == 0 ? "filesystem" : path;
	// Get parent element
	var parentElement = document.getElementById(id);
	if (parentElement === null)
		return;
	// Clean parent element
	clearDirectory(parentElement);
	// Build each path content element
	for (var index in directory) {
		// Get path file
		var file = directory[index];
		// Skip hidden file
		if (file.hidden)
			continue;
		// Append build file element
		parentElement.appendChild(buildDirectory(file, depth));
	}
	// Change a element expanded status
	var aElement = parentElement.firstChild;
	aElement.expanded = true;
	// Change img class name
	var imgElement = aElement.firstChild;
	imgElement.className = "expanded";
};

/*
 * Build directory.
 */
var buildDirectory = function (directory, depth) {
	/*
	 * Create root div element.
	 */
	// Create div element
	var divElement = document.createElement("div");
	// Set identifier as path
	divElement.id = directory.path;
	// Mark as not selected
	divElement.isSelected = false;
	// Add padding related to depth
	divElement.style = "margin-left: " + (depth * 20) + "px;";
	/*
	 * Create a element.
	 */
	// Create a element
	var aElement = document.createElement("a");
	// Set link as empty anchor
	aElement.href = "#";
	// Mark as not expanded
	aElement.expanded = false;
	// Add onclick behavior
	aElement.onclick = function () {
		// Check expanded status
		if (aElement.expanded) {
			// Clear directory
			clearDirectory(aElement.parentNode);
		} else {
			// Explore directory
			explore(directory.path);
		}
	};
	// Append a element to root div element
	divElement.appendChild(aElement);
	/*
	 * Create icon div element.
	 */
	// Create icon div element
	var iconDivElement = document.createElement("div");
	// Set default class name as contracted
	iconDivElement.className = "contracted";
	// Append icon div element to a element
	aElement.appendChild(iconDivElement);
	/*
	 * Create label div element.
	 */
	// Create label div element
	var labelDivElement = document.createElement("div");
	// Set display style
	labelDivElement.style = "display: inline;";
	// Set content as directory name
	labelDivElement.innerHTML = directory.name;
	// Add onclick behavior
	labelDivElement.onclick = function () {
		// Select directory
		selectDirectory(labelDivElement.parentNode);
	}
	// Append label div element to root div element
	divElement.appendChild(labelDivElement);
	// Return root div element
	return divElement;
};

/*
 * Select a directory.
 */
var selectDirectory = function (directoryElement) {
	// Check current selected path
	if (selectedPath !== null) {
		// Get related selected element
		var selectedDirectoryElement = document.getElementById(selectedPath);
		if (selectedDirectoryElement !== null) {
			// Mark as not selected
			selectedDirectoryElement.isSelected = false;
			// Remove class name
			selectedDirectoryElement.className = "";
		}
	}
	// Mark as selected
	directoryElement.isSelected = true;
	// Add selected class name
	directoryElement.className = "selected";
	// Save selected path
	selectedPath = directoryElement.id;
};

/*
 * Clear a directory content.
 */
var clearDirectory = function (directoryElement) {
	// Get directory element children
	var children = directoryElement.childNodes;
	// Check if root must be kept
	var keepChildren = directoryElement.id === "filesystem" ? 0 : 2;
	// Remove children
	while (children.length > keepChildren) {
		directoryElement.removeChild(children[keepChildren]);
	}
	// Check children to update
	if (keepChildren > 0) {
		// Change a element expanded status
		var aElement = directoryElement.firstChild;
		aElement.expanded = false;
		// Change icon div class name
		var iconDivElement = aElement.firstChild;
		iconDivElement.className = "contracted";
	}
};

/*
 * Explore a path.
 */
var explore = function (path) {
	// Send a message to list content of a path
	self.port.emit("ls", path);
};

/*
 * Valid the selected path.
 */
var valid = function () {
	// Check selected path
	if (selectedPath === null)
		return;
	// Send add-on message to select path
	self.port.emit("select", selectedPath);
};

/*
 * Cancel the dialog.
 */
var cancel = function() {
	// Send add-on message to close panel
	self.port.emit("cancel");
};

var dump = function (variable, filter) {
	self.port.emit("dump", variable, filter);
};

/*
 * Initialize control action.
 */
// Get select element
var selectElement = document.getElementById("select");
// Add select action
selectElement.onclick = valid;
// Get cancel element
var cancelElement = document.getElementById("cancel");
// Add cancel action
cancelElement.onclick = cancel;

/*
 * Create message reception.
 */
// Create ls message receiver
self.port.on("ls", function (path, content) {
	fileSystem.add(path, content);
	buildExplorer(path, fileSystem.computeDepth(path));
});