var Types = require('./types');

function gettersetter(store) {
  var prop = function() {
    if (arguments.length) store = arguments[0];
    return store
  };

  prop.toJSON = function() {
    return store
  };

  return prop
}

module.exports = function (store) {
  //note: using non-strict equality check here because we're checking if store is null OR undefined
  if (((store != null && type.call(store) == Types.sObj) || typeof store == sFn) && typeof store.then == Types.sFn) {
    return propify(store)
  }

  return gettersetter(store)
};
