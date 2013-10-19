
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

var buildExplorer = function (path, depth) {
	var directory = fileSystem.get(path);
	if (directory === undefined)
		return;
	var id = depth == 0 ? "filesystem" : path;
	// Get parent element
	var parentElement = document.getElementById(id);
	// Clean parent element if exists
	if (parentElement !== null)
		clearDirectory(parentElement);
	
	for (var index in directory) {
		var file = directory[index];
		if (file.hidden)
			continue;
		parentElement.appendChild(buildDirectoryElement(file, depth));
	}
};

var buildDirectoryElement = function (directory, depth) {
	var divElement = document.createElement("div");
	divElement.id = directory.path;
	divElement.isSelected = false;
	divElement.style = "margin-left: " + (depth * 20) + "px;";
	
	var aElement = document.createElement("a");
	aElement.href = "#";
	aElement.onclick = function () {
		console.log(aElement.expanded);
		if (aElement.expanded) {
			clearDirectory(aElement.parentNode);
		} else {
			explore(directory.path);
		}
		aElement.expanded = !aElement.expanded;
		aElement.innerHTML = aElement.expanded ? "-" : "+";
	};
	
	var content = directory.foldercount == 0 ? " " : "+";
	aElement.innerHTML = content;
	aElement.expanded = false;
	divElement.appendChild(aElement);
	
	var labelElement = document.createElement("div");
	labelElement.style = "display: inline;";
	labelElement.innerHTML = directory.name;
	labelElement.onclick = function () {
		toggleSelection(labelElement.parentNode);
	}
	divElement.appendChild(labelElement);
	
	return divElement;
}

var toggleSelection = function (directoryElement) {
	var selected = !directoryElement.isSelected;
	directoryElement.isSelected = selected;
	if (selected) {
		if (selectedPath !== null) {
			var selectedDirectoryElement = document.getElementByIt(selectedPath);
			if (selectedDirectoryElement !== null)
				toggleSelection(selectedDirectoryElement);
		}
		directoryElement.className = "selected";
		selectedPath = directoryElement.id;
	} else {
		directoryElement.className = "";
		selectedPath = null;
	}
} 

var clearDirectory = function (directoryElement) {
	var childrens = directoryElement.childNodes;
	var keepChildren = directoryElement.id === "filesystem" ? 0 : 2;
	while (childrens.length > keepChildren) {
		directoryElement.removeChild(childrens[keepChildren]);
	}
}

/*
 * Explore a path.
 */
var explore = function (path) {
	// Send a message to list content of a path
	self.port.emit("ls", path);
}

/*
 * Valid the selected path.
 */
var valid = function () {
	// Check selected path
	if (selectedPath === null)
		return;
	// Send add-on message to select path
	self.port.emit("select", selectedPath);
}

/*
 * Cancel the dialog.
 */
var cancel = function() {
	// Send add-on message to close panel
	self.port.emit("cancel");
}

var dump = function (variable, filter) {
	self.port.emit("dump", variable, filter);
}

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