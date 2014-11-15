var queryString = require('./query-string');

module.exports = function ajax(options) {
  if (options.dataType && options.dataType.toLowerCase() === "jsonp") {
    var callbackKey = "mithril_callback_" + new Date().getTime() + "_" + (Math.round(Math.random() * 1e16)).toString(36);
    var script = $document.createElement("script");

    window[callbackKey] = function(resp) {
      $document.body.removeChild(script);
      options.onload({
        type: "load",
        target: {
          responseText: resp
        }
      });
      window[callbackKey] = undefined
    };

    script.onerror = function(e) {
      $document.body.removeChild(script);

      options.onerror({
        type: "error",
        target: {
          status: 500,
          responseText: JSON.stringify({error: "Error making jsonp request"})
        }
      });
      window[callbackKey] = undefined;

      return false
    };

    script.onload = function(e) {
      return false
    };

    script.src = options.url
      + (options.url.indexOf("?") > 0 ? "&" : "?")
      + (options.callbackKey ? options.callbackKey : "callback")
      + "=" + callbackKey
      + "&" + queryString.build(options.data || {});
    $document.body.appendChild(script)
  }
  else {
    var xhr = new window.XMLHttpRequest;
    xhr.open(options.method, options.url, true, options.user, options.password);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) options.onload({type: "load", target: xhr});
        else options.onerror({type: "error", target: xhr})
      }
    };
    if (options.serialize == JSON.stringify && options.data && options.method != "GET") {
      xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8")
    }
    if (options.deserialize == JSON.parse) {
      xhr.setRequestHeader("Accept", "application/json, text/*");
    }
    if (typeof options.config == sFn) {
      var maybeXhr = options.config(xhr, options);
      if (maybeXhr != null) xhr = maybeXhr
    }

    var data = options.method == "GET" || !options.data ? "" : options.data
    if (data && (type.call(data) != sStr && data.constructor != window.FormData)) {
      throw "Request data should be either be a string or FormData. Check the `serialize` option in `m.request`";
    }
    xhr.send(data);
    return xhr
  }
}
