//routing
var modes = {pathname: "", hash: "#", search: "?"};
var redirect = function() {}, routeParams = {}, currentRoute;

var Types = require('./types');

var queryString = require('./query-string');

var m = {}

module.exports = m.route;

m.route = function() {
  //m.route()
  if (arguments.length === 0) return currentRoute;
  else if (arguments.length === 3 && type.call(arguments[1]) == sStr) {
    var root = arguments[0], defaultRoute = arguments[1], router = arguments[2];
    redirect = function(source) {
      var path = currentRoute = normalizeRoute(source);
      if (!routeByValue(root, router, path)) {
        m.route(defaultRoute, true)
      }
    };
    var listener = m.route.mode == "hash" ? "onhashchange" : "onpopstate";
    window[listener] = function() {
      if (currentRoute != normalizeRoute($location[m.route.mode])) {
        redirect($location[m.route.mode])
      }
    };
    computePostRedrawHook = setScroll;
    window[listener]()
  }
  //config: m.route
  else if (arguments[0].addEventListener) {
    var element = arguments[0];
    var isInitialized = arguments[1];
    var context = arguments[2];
    element.href = (m.route.mode !== 'pathname' ? $location.pathname : '') + modes[m.route.mode] + this.attrs.href;
    element.removeEventListener("click", routeUnobtrusive);
    element.addEventListener("click", routeUnobtrusive)
  }
  //m.route(route)
  else if (type.call(arguments[0]) == sStr) {
    currentRoute = arguments[0];
    var querystring = arguments[1] != null && type.call(arguments[1]) == Types.sObj ? queryString.build(arguments[1]) : null;
    if (querystring) currentRoute += (currentRoute.indexOf("?") === -1 ? "?" : "&") + querystring;

    var shouldReplaceHistoryEntry = (arguments.length == 3 ? arguments[2] : arguments[1]) === true;

    if (window.history.pushState) {
      computePostRedrawHook = function() {
        window.history[shouldReplaceHistoryEntry ? "replaceState" : "pushState"](null, $document.title, modes[m.route.mode] + currentRoute);
        setScroll()
      };
      redirect(modes[m.route.mode] + currentRoute)
    }
    else $location[m.route.mode] = currentRoute
  }
};
Router.route.param = function(key) {return routeParams[key]};
Router.route.mode = "search";

function normalizeRoute(route) {return route.slice(modes[m.route.mode].length)}
function routeByValue(root, router, path) {
  routeParams = {};

  var queryStart = path.indexOf("?");
  if (queryStart !== -1) {
    routeParams = queryString.parse(path.substr(queryStart + 1, path.length));
    path = path.substr(0, queryStart)
  }

  for (var route in router) {
    if (route == path) {
      m.module(root, router[route]);
      return true
    }

    var matcher = new RegExp("^" + route.replace(/:[^\/]+?\.{3}/g, "(.*?)").replace(/:[^\/]+/g, "([^\\/]+)") + "\/?$");

    if (matcher.test(path)) {
      path.replace(matcher, function() {
        var keys = route.match(/:[^\/]+/g) || [];
        var values = [].slice.call(arguments, 1, -2);
        for (var i = 0; i < keys.length; i++) routeParams[keys[i].replace(/:|\./g, "")] = decodeURIComponent(values[i])
        m.module(root, router[route])
      });
      return true
    }
  }
}
function routeUnobtrusive(e) {
  e = e || event;
  if (e.ctrlKey || e.metaKey || e.which == 2) return;
  if (e.preventDefault) e.preventDefault();
  else e.returnValue = false;
  var currentTarget = e.currentTarget || this;
  var args = m.route.mode == "pathname" && currentTarget.search ? queryString.parse(currentTarget.search.slice(1)) : {};
  m.route(currentTarget[m.route.mode].slice(modes[m.route.mode].length), args)
}
function setScroll() {
  if (m.route.mode != "hash" && $location.hash) $location.hash = $location.hash;
  else window.scrollTo(0, 0)
}

function propify(promise) {
  var prop = m.prop();
  promise.then(prop);
  prop.then = function(resolve, reject) {
    return propify(promise.then(resolve, reject))
  };
  return prop
}
