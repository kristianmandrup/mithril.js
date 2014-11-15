var m = require('./m');

function identity(value) {return value}

module.exports = function(xhrOptions) {
  if (xhrOptions.background !== true) m.computation.start();
  var deferred = m.deferred();
  var isJSONP = xhrOptions.dataType && xhrOptions.dataType.toLowerCase() === "jsonp";
  var serialize = xhrOptions.serialize = isJSONP ? identity : xhrOptions.serialize || JSON.stringify;
  var deserialize = xhrOptions.deserialize = isJSONP ? identity : xhrOptions.deserialize || JSON.parse;
  var extract = xhrOptions.extract || function(xhr) {
    return xhr.responseText.length === 0 && deserialize === JSON.parse ? null : xhr.responseText
  };
  xhrOptions.url = parameterizeUrl(xhrOptions.url, xhrOptions.data);
  xhrOptions = bindData(xhrOptions, xhrOptions.data, serialize);
  xhrOptions.onload = xhrOptions.onerror = function(e) {
    try {
      e = e || event;
      var unwrap = (e.type == "load" ? xhrOptions.unwrapSuccess : xhrOptions.unwrapError) || identity;
      var response = unwrap(deserialize(extract(e.target, xhrOptions)));
      if (e.type == "load") {
        if (type.call(response) == sArr && xhrOptions.type) {
          for (var i = 0; i < response.length; i++) response[i] = new xhrOptions.type(response[i])
        }
        else if (xhrOptions.type) response = new xhrOptions.type(response)
      }
      deferred[e.type == "load" ? "resolve" : "reject"](response)
    }
    catch (e) {
      m.deferred.onerror(e);
      deferred.reject(e)
    }
    if (xhrOptions.background !== true) m.computation.end()
  };
  ajax(xhrOptions);
  deferred.promise(xhrOptions.initialValue);
  return deferred.promise
};

function bindData(xhrOptions, data, serialize) {
  if (xhrOptions.method == "GET" && xhrOptions.dataType != "jsonp") {
    var prefix = xhrOptions.url.indexOf("?") < 0 ? "?" : "&";
    var querystring = queryString.build(data);
    xhrOptions.url = xhrOptions.url + (querystring ? prefix + querystring : "")
  }
  else xhrOptions.data = serialize(data);
  return xhrOptions
}

function parameterizeUrl(url, data) {
  var tokens = url.match(/:[a-z]\w+/gi);
  if (tokens && data) {
    for (var i = 0; i < tokens.length; i++) {
      var key = tokens[i].slice(1);
      url = url.replace(tokens[i], data[key]);
      delete data[key]
    }
  }
  return url
}
