/*
 * Dump an object.
 */
let dump = function(object, filter) {
	rdump(object, 0, 5, filter);
}

/*
 * Recursive dump an object.
 */
let rdump = function(object, depth, maxDepth, filter) {
	// Check depth
	if (depth == 0) {
		let header = 'Dumping';
		if (typeof filter != 'undefined')
			header += ' (' + filter + ')';
		header += ': ' + object;
		console.log(header);
	} else if (depth > maxDepth) {
		return;
	}
	// Compute padding
	let padding = '';
	for (let i = 0; i < depth; i++) {
		padding = padding + '  ';
	}
	// Dump each member of object
	for (let index in object) {
		// Check and apply member name filter
		if (typeof filter != 'undefined' && !index.contains(filter))
			continue
			// Try to get member value
		let member = undefined;
		try {
			member = object[index];
		} catch (error) {}
		// Check member type
		if (typeof member == 'undefined') {
			// Member could not be read
			console.log(padding + ' - ' + index + ': <undefined>');
		} else if (typeof member === 'object') {
			// Dump member name
			console.log(padding + ' - ' + index + ':');
			// Recursive dump next level
			rdump(member, depth + 1, maxDepth, filter);
		} else {
			// Dump member name and value
			console.log(padding + ' - ' + index + ': ' + member);
		}
	}
}

exports.dump = dump;
