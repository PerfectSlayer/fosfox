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
 * Create message reception.
 */
// Create message receiver
window.addEventListener('message', function(event) {
	// Check event data action
	if (typeof event.data.action === undefined)
		return;
	// Check display action
	if (event.data.action === 'display' && typeof event.data.locations === 'object') {
		// Get locations to display
		var locations = event.data.locations;
		// Remove all locations
		w2ui.grid.records.length = 0;
		// Convert each location to grid record
		var index = 1;
		for (var site in locations) {
			// Append location as grid record
			w2ui.grid.records.push({
				'recid': index++,
				'site': site,
				'location': locations[site].path,
				'always': locations[site].always ? "Oui" : "Non"
			});
		}
		// Update the grid
		w2ui.grid.refresh();
	}
}, false);

/*
 * Initialize grid.
 */
$(function () {
	// Create grid
	$('#locations').w2grid({
		name: 'grid',
		header: 'Destination des téléchargements',
		// url: 'data/list.json',
		show: {
			header: true,
			toolbar: true,
			toolbarReload: false,
			toolbarColumns: false,
			toolbarEdit: true,
			toolbarDelete: true,
			footer: true,
			selectColumn: true
		},
		columns: [
			{
				field: 'site',
				caption: 'Site',
				size: '40%',
				resizable: true,
				sortable: true
			},
			{
				field: 'location',
				caption: 'Destination',
				size: '50%',
				resizable: true,
				sortable: true
			},
			{
				field: 'always',
				caption: 'Toujours',
				size: '10%',
				resizable: true,
				sortable: true
			}
		],
		multiSearch: false,
		multiSelect: false,
		searches: [
			{
				type: 'text',
				field: 'site',
				caption: 'Site'
			},
			{
				type: 'text',
				field: 'location',
				caption: 'Destination'
			}
		],
		onEdit: function (event) {
			// Get indexes of selected records
			var indexes = w2ui.grid.getSelection(true);
			// Delete each site location
			for (var key in indexes) {
				// Get selected recod
				var record =  w2ui.grid.records[indexes[key]];
				// Send add-on message to edit path for the site
				window.postMessage({
					action: 'edit',
					site: record.site
				}, '*');
			}
		},
		onDelete: function (event) {
			// Remove confirmation dialog
			event.force = true;
			// Get indexes of selected records
			var indexes = w2ui.grid.getSelection(true);
			// Delete each site location
			for (var key in indexes) {
				// Get selected recod
				var record =  w2ui.grid.records[indexes[key]];
				// Send add-on message to delete path for the site
				window.postMessage({
					action: 'delete',
					site: record.site
				}, '*');
			}
		},
	});
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