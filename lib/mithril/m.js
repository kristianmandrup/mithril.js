/*
 * @typedef {String} Tag
 * A string that looks like -> div.classname#id[param=one][param2=two]
 * Which describes a DOM node
 */

var parser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[.+?\])/g, attrParser = /\[(.+?)(?:=("|'|)(.*?)\2)?\]/;

var Types = require('./types');

/*
 *
 * @param {Tag} The DOM node tag
 * @param {Object=[]} optional key-value pairs to be mapped to DOM attrs
 * @param {...mNode=[]} Zero or more Mithril child nodes. Can be an array, or splat (optional)
 *
 */
function m() {
  var args = [].slice.call(arguments);
  var hasAttrs = args[1] != null && type.call(args[1]) == Types.sObj && !("tag" in args[1]) && !("subtree" in args[1]);
  var attrs = hasAttrs ? args[1] : {};
  var classAttrName = "class" in attrs ? "class" : "className";
  var cell = {tag: "div", attrs: {}};
  var match, classes = [];
  while (match = parser.exec(args[0])) {
    if (match[1] == "" && match[2]) cell.tag = match[2];
    else if (match[1] == "#") cell.attrs.id = match[2];
    else if (match[1] == ".") classes.push(match[2]);
    else if (match[3][0] == "[") {
      var pair = attrParser.exec(match[3]);
      cell.attrs[pair[1]] = pair[3] || (pair[2] ? "" :true)
    }
  }
  if (classes.length > 0) cell.attrs[classAttrName] = classes.join(" ");


  var children = hasAttrs ? args[2] : args[1];
  if (type.call(children) == sArr) {
    cell.children = children
  }
  else {
    cell.children = hasAttrs ? args.slice(2) : args.slice(1)
  }

  for (var attrName in attrs) {
    if (attrName == classAttrName) cell.attrs[attrName] = (cell.attrs[attrName] || "") + " " + attrs[attrName];
    else cell.attrs[attrName] = attrs[attrName]
  }
  return cell
}

var data      = require('./data');
m.ajax        = data.ajax;
m.request     = data.request;
m.computation = data.computation;

// TODO: to be deprecated!!
m.startComputation = m.computation.start;
m.endComputation = m.computation.end;

var property  = require('./property');
m.prop        = property.prop;
m.sync        = property.sync;
m.withAttr    = property.withAttr;

var render    = require('./render');
m.build       = render.build;
m.redraw      = render.redraw;
m.render      = render.render;

m.deferred    = require('./promise');

m.route       = require('./route');
m.module      = require('./app').module;

m.trust = function(value) {
  value = new String(value);
  value.$trusted = true;
  return value
};

m.roots = [];
m.modules = [];
m.controllers = [];
