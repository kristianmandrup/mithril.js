var m = require('../mithril/m');

module.exports = m.deps;

//testing API
m.deps = function(mock) {
  initialize(window = mock || window);
  return window;
};

//for internal testing only, do not use `m.deps.factory`
m.deps.factory = app;
