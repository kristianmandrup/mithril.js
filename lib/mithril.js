Mithril = m = new function app(window, undefined) {
	// caching commonly used variables
	var $document, $location, $requestAnimationFrame, $cancelAnimationFrame;

	// self invoking function needed because of the way mocks work
	function initialize(window){
		$document = window.document;
		$location = window.location;
		$cancelAnimationFrame = window.cancelAnimationFrame || window.clearTimeout;
		$requestAnimationFrame = window.requestAnimationFrame || window.setTimeout;
	}

	initialize(window);

	return m
}(typeof window != "undefined" ? window : {});

if (typeof module != "undefined" && module !== null) module.exports = m;
if (typeof define == "function" && define.amd) define(function() {return m});
