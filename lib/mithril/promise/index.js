var Types     = require('./types');
var m         = require('./m');
var Deferred  = require('./deferred');

module.exports = m.deferred;

m.deferred = function () {
  var deferred = new Deferred();
  deferred.promise = propify(deferred.promise);
  return deferred
};


m.deferred.onerror = function(e) {
  if (type.call(e) == "[object Error]" && !e.constructor.toString().match(/ Error/)) throw e
};
