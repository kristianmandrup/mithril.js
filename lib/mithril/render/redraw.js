var m = require('./m');

var FRAME_BUDGET = 16; //60 frames per second = 1 call per 16 ms
var lastRedrawId = null, lastRedrawCallTime = 0, computePostRedrawHook = null;

var Redraw = {};
Redraw.redraw.strategy = m.prop();

module.exports = Redraw.redraw;

Redraw.redraw = function(force) {
  //lastRedrawId is a positive number if a second redraw is requested before the next animation frame
  //lastRedrawID is null if it's the first redraw and not an event handler
  if (lastRedrawId && force !== true) {
    //when setTimeout: only reschedule redraw if time between now and previous redraw is bigger than a frame, otherwise keep currently scheduled timeout
    //when rAF: always reschedule redraw
    if (new Date - lastRedrawCallTime > FRAME_BUDGET || $requestAnimationFrame == window.requestAnimationFrame) {
      if (lastRedrawId > 0) $cancelAnimationFrame(lastRedrawId);
      lastRedrawId = $requestAnimationFrame(redraw, FRAME_BUDGET)
    }
  }
  else {
    redraw();
    lastRedrawId = $requestAnimationFrame(function() {lastRedrawId = null}, FRAME_BUDGET)
  }
};

function redraw() {
  var mode = m.redraw.strategy();
  for (var i = 0; i < roots.length; i++) {
    if (controllers[i] && mode != "none") {
      m.render(roots[i], modules[i].view(controllers[i]), mode == "all")
    }
  }
  //after rendering within a routed context, we need to scroll back to the top, and fetch the document title for history.pushState
  if (computePostRedrawHook) {
    computePostRedrawHook();
    computePostRedrawHook = null
  }
  lastRedrawId = null;
  lastRedrawCallTime = new Date;
  m.redraw.strategy("diff")
}
