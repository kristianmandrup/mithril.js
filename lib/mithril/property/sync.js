var m = require('./m');

module.exports = function(args) {
  var method = "resolve";
  function synchronizer(pos, resolved) {
    return function(value) {
      results[pos] = value;
      if (!resolved) method = "reject";
      if (--outstanding == 0) {
        deferred.promise(results);
        deferred[method](results)
      }
      return value
    }
  }

  var deferred = m.deferred();
  var outstanding = args.length;
  var results = new Array(outstanding);
  if (args.length > 0) {
    for (var i = 0; i < args.length; i++) {
      args[i].then(synchronizer(i, true), synchronizer(i, false))
    }
  }
  else deferred.resolve([]);

  return deferred.promise
};
