var build        = require('./build')
var documentNode = require('./document-node')
var nodeCache = [], cellCache = {};

var Render = {};

module.exports = Render.render;

Render.render = function(root, cell, forceRecreation) {
  var configs = [];
  if (!root) throw new Error("Please ensure the DOM element exists before rendering a template into it.");
  var id = getCellCacheKey(root);
  var isDocumentRoot = root == $document;
  var node = isDocumentRoot || root == $document.documentElement ? documentNode : root;
  if (isDocumentRoot && cell.tag != "html") cell = {tag: "html", attrs: {}, children: cell};
  if (cellCache[id] === undefined) clear(node.childNodes);
  if (forceRecreation === true) reset(root);
  cellCache[id] = build(node, null, undefined, undefined, cell, cellCache[id], false, 0, null, undefined, configs);
  for (var i = 0; i < configs.length; i++) configs[i]()
};

function getCellCacheKey(element) {
  var index = nodeCache.indexOf(element);
  return index < 0 ? nodeCache.push(element) - 1 : index
}

function reset(root) {
  var cacheKey = getCellCacheKey(root);
  clear(root.childNodes, cellCache[cacheKey]);
  cellCache[cacheKey] = undefined
}


function clear(nodes, cached) {
  for (var i = nodes.length - 1; i > -1; i--) {
    if (nodes[i] && nodes[i].parentNode) {
      nodes[i].parentNode.removeChild(nodes[i]);
      cached = [].concat(cached);
      if (cached[i]) unload(cached[i])
    }
  }
  if (nodes.length != 0) nodes.length = 0
}
