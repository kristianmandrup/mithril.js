module.exports = {
  build: buildQueryString,
  parse: parseQueryString
}


var buildQueryString = function (object, prefix) {
  var str = [];
  for(var prop in object) {
    var key = prefix ? prefix + "[" + prop + "]" : prop, value = object[prop];
    str.push(value != null && type.call(value) == Types.sObj ? buildQueryString(value, key) : encodeURIComponent(key) + "=" + encodeURIComponent(value))
  }
  return str.join("&")
}
var parseQueryString = function(str) {
  var pairs = str.split("&"), params = {};
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split("=");
    params[decodeSpace(pair[0])] = pair[1] ? decodeSpace(pair[1]) : (pair.length === 1 ? true : "")
  }
  return params
}
function decodeSpace(string) {
  return decodeURIComponent(string.replace(/\+/g, " "))
}
