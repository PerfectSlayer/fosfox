/*
 * Create message reception.
 */
// Create set-step message receiver
self.port.on("set-step", function (step) {
	document.getElementById("step").innerHTML = step;
});
// Create set-status message receiver
self.port.on("set-status", function (status, type) {
	var element = document.getElementById("status");
	element.innerHTML = status;
	element.className = type
});