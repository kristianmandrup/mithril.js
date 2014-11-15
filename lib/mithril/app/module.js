m = require('./m');

var topModule;

module.exports = function(root, module) {
  var index = m.roots.indexOf(root);
  if (index < 0) index = roots.length;
  var isPrevented = false;
  if (controllers[index] && typeof controllers[index].onunload == sFn) {
    var event = {
      preventDefault: function() {isPrevented = true}
    };
    m.controllers[index].onunload(event)
  }
  if (!isPrevented) {
    m.redraw.strategy("all");
    m.computation.start();
    m.roots[index] = root;
    var currentModule = topModule = module;
    var controller = new module.controller;
    //controllers may call m.module recursively (via m.route redirects, for example)
    //this conditional ensures only the last recursive m.module call is applied
    if (currentModule == topModule) {
      controllers[index] = controller;
      modules[index] = module
    }
    m.computation.end();
    return controllers[index]
  }
};
