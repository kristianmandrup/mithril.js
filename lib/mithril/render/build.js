var Types = require('./types');

var Builder = {};

module.exports = {
  build: Builder.build,
  unload: Builder.unload
}

var voidElements = /AREA|BASE|BR|COL|COMMAND|EMBED|HR|IMG|INPUT|KEYGEN|LINK|META|PARAM|SOURCE|TRACK|WBR/;
var type = {}.toString;

Builder.unload = function(cached) {
  if (cached.configContext && typeof cached.configContext.onunload == sFn) cached.configContext.onunload();
  if (cached.children) {
    if (type.call(cached.children) == sArr) {
      for (var i = 0; i < cached.children.length; i++) unload(cached.children[i])
    }
    else if (cached.children.tag) unload(cached.children)
  }
}


Builder.build = function (parentElement, parentTag, parentCache, parentIndex, data, cached, shouldReattach, index, editable, namespace, configs) {
  //`build` is a recursive function that manages creation/diffing/removal of DOM elements based on comparison between `data` and `cached`
  //the diff algorithm can be summarized as this:
  //1 - compare `data` and `cached`
  //2 - if they are different, copy `data` to `cached` and update the DOM based on what the difference is
  //3 - recursively apply this algorithm for every array and for the children of every virtual element

  //the `cached` data structure is essentially the same as the previous redraw's `data` data structure, with a few additions:
  //- `cached` always has a property called `nodes`, which is a list of DOM elements that correspond to the data represented by the respective virtual element
  //- in order to support attaching `nodes` as a property of `cached`, `cached` is *always* a non-primitive object, i.e. if the data was a string, then cached is a String instance. If data was `null` or `undefined`, cached is `new String("")`
  //- `cached also has a `configContext` property, which is the state storage object exposed by config(element, isInitialized, context)
  //- when `cached` is an Object, it represents a virtual element; when it's an Array, it represents a list of elements; when it's a String, Number or Boolean, it represents a text node

  //`parentElement` is a DOM element used for W3C DOM API calls
  //`parentTag` is only used for handling a corner case for textarea values
  //`parentCache` is used to remove nodes in some multi-node cases
  //`parentIndex` and `index` are used to figure out the offset of nodes. They're artifacts from before arrays started being flattened and are likely refactorable
  //`data` and `cached` are, respectively, the new and old nodes being diffed
  //`shouldReattach` is a flag indicating whether a parent node was recreated (if so, and if this node is reused, then this node must reattach itself to the new parent)
  //`editable` is a flag that indicates whether an ancestor is contenteditable
  //`namespace` indicates the closest HTML namespace as it cascades down from an ancestor
  //`configs` is a list of config functions to run after the topmost `build` call finishes running

  //there's logic that relies on the assumption that null and undefined data are equivalent to empty strings
  //- this prevents lifecycle surprises from procedural helpers that mix implicit and explicit return statements
  //- it simplifies diffing code
  if (data == null) data = "";
  if (data.subtree === "retain") return cached;
  var cachedType = type.call(cached), dataType = type.call(data);
  if (cached == null || cachedType != dataType) {
    if (cached != null) {
      if (parentCache && parentCache.nodes) {
        var offset = index - parentIndex;
        var end = offset + (dataType == sArr ? data : cached.nodes).length;
        clear(parentCache.nodes.slice(offset, end), parentCache.slice(offset, end))
      }
      else if (cached.nodes) clear(cached.nodes, cached)
    }
    cached = new data.constructor;
    if (cached.tag) cached = {}; //if constructor creates a virtual dom element, use a blank object as the base cached node instead of copying the virtual el (#277)
    cached.nodes = []
  }

  if (dataType == sArr) {
    data = flatten(data);
    var nodes = [], intact = cached.length === data.length, subArrayCount = 0;

    //keys algorithm: sort elements without recreating them if keys are present
    //1) create a map of all existing keys, and mark all for deletion
    //2) add new keys to map and mark them for addition
    //3) if key exists in new list, change action from deletion to a move
    //4) for each key, handle its corresponding action as marked in previous steps
    //5) copy unkeyed items into their respective gaps
    var DELETION = 1, INSERTION = 2 , MOVE = 3;
    var existing = {}, unkeyed = [], shouldMaintainIdentities = false;
    for (var i = 0; i < cached.length; i++) {
      if (cached[i] && cached[i].attrs && cached[i].attrs.key != null) {
        shouldMaintainIdentities = true;
        existing[cached[i].attrs.key] = {action: DELETION, index: i}
      }
    }
    if (shouldMaintainIdentities) {
      for (var i = 0; i < data.length; i++) {
        if (data[i] && data[i].attrs) {
          if (data[i].attrs.key != null) {
            var key = data[i].attrs.key;
            if (!existing[key]) existing[key] = {action: INSERTION, index: i};
            else existing[key] = {
              action: MOVE,
              index: i,
              from: existing[key].index,
              element: parentElement.childNodes[existing[key].index] || $document.createElement("div")
            }
          }
          else unkeyed.push({index: i, element: parentElement.childNodes[i] || $document.createElement("div")})
        }
      }
      var actions = Object.keys(existing).map(function(key) {return existing[key]});
      var changes = actions.sort(function(a, b) {return a.action - b.action || a.index - b.index});
      var newCached = cached.slice();

      for (var i = 0, change; change = changes[i]; i++) {
        if (change.action == DELETION) {
          clear(cached[change.index].nodes, cached[change.index]);
          newCached.splice(change.index, 1)
        }
        if (change.action == INSERTION) {
          var dummy = $document.createElement("div");
          dummy.key = data[change.index].attrs.key;
          parentElement.insertBefore(dummy, parentElement.childNodes[change.index] || null);
          newCached.splice(change.index, 0, {attrs: {key: data[change.index].attrs.key}, nodes: [dummy]})
        }

        if (change.action == MOVE) {
          if (parentElement.childNodes[change.index] !== change.element && change.element !== null) {
            parentElement.insertBefore(change.element, parentElement.childNodes[change.index] || null)
          }
          newCached[change.index] = cached[change.from]
        }
      }
      for (var i = 0; i < unkeyed.length; i++) {
        var change = unkeyed[i];
        parentElement.insertBefore(change.element, parentElement.childNodes[change.index] || null);
        newCached[change.index] = cached[change.index]
      }
      cached = newCached;
      cached.nodes = [];
      for (var i = 0, child; child = parentElement.childNodes[i]; i++) cached.nodes.push(child)
    }
    //end key algorithm

    for (var i = 0, cacheCount = 0; i < data.length; i++) {
      //diff each item in the array
      var item = build(parentElement, parentTag, cached, index, data[i], cached[cacheCount], shouldReattach, index + subArrayCount || subArrayCount, editable, namespace, configs);
      if (item === undefined) continue;
      if (!item.nodes.intact) intact = false;
      if (item.$trusted) {
        //fix offset of next element if item was a trusted string w/ more than one html element
        //the first clause in the regexp matches elements
        //the second clause (after the pipe) matches text nodes
        subArrayCount += (item.match(/<[^\/]|\>\s*[^<]/g) || []).length
      }
      else subArrayCount += type.call(item) == sArr ? item.length : 1;
      cached[cacheCount++] = item
    }
    if (!intact) {
      //diff the array itself

      //update the list of DOM nodes by collecting the nodes from each item
      for (var i = 0; i < data.length; i++) {
        if (cached[i] != null) nodes.push.apply(nodes, cached[i].nodes)
      }
      //remove items from the end of the array if the new array is shorter than the old one
      //if errors ever happen here, the issue is most likely a bug in the construction of the `cached` data structure somewhere earlier in the program
      for (var i = 0, node; node = cached.nodes[i]; i++) {
        if (node.parentNode != null && nodes.indexOf(node) < 0) clear([node], [cached[i]])
      }
      //add items to the end if the new array is longer than the old one
      for (var i = cached.nodes.length, node; node = nodes[i]; i++) {
        if (node.parentNode == null) parentElement.appendChild(node)
      }
      if (data.length < cached.length) cached.length = data.length;
      cached.nodes = nodes
    }
  }
  else if (data != null && dataType == Types.sObj) {
    if (!data.attrs) data.attrs = {};
    if (!cached.attrs) cached.attrs = {};

    var dataAttrKeys = Object.keys(data.attrs);
    //if an element is different enough from the one in cache, recreate it
    if (data.tag != cached.tag || dataAttrKeys.join() != Object.keys(cached.attrs).join() || data.attrs.id != cached.attrs.id) {
      if (cached.nodes.length) clear(cached.nodes);
      if (cached.configContext && typeof cached.configContext.onunload == sFn) cached.configContext.onunload()
    }
    if (type.call(data.tag) != sStr) return;

    var node, isNew = cached.nodes.length === 0;
    if (data.attrs.xmlns) namespace = data.attrs.xmlns;
    else if (data.tag === "svg") namespace = "http://www.w3.org/2000/svg";
    else if (data.tag === "math") namespace = "http://www.w3.org/1998/Math/MathML";
    if (isNew) {
      if (data.attrs.is) node = namespace === undefined ? $document.createElement(data.tag, data.attrs.is) : $document.createElementNS(namespace, data.tag, data.attrs.is);
      else node = namespace === undefined ? $document.createElement(data.tag) : $document.createElementNS(namespace, data.tag);
      cached = {
        tag: data.tag,
        //set attributes first, then create children
        attrs: dataAttrKeys.length ? setAttributes(node, data.tag, data.attrs, {}, namespace) : {},
        children: data.children != null && data.children.length > 0 ?
          build(node, data.tag, undefined, undefined, data.children, cached.children, true, 0, data.attrs.contenteditable ? node : editable, namespace, configs) :
          data.children,
        nodes: [node]
      };
      if (cached.children && !cached.children.nodes) cached.children.nodes = [];
      //edge case: setting value on <select> doesn't work before children exist, so set it again after children have been created
      if (data.tag == "select" && data.attrs.value) setAttributes(node, data.tag, {value: data.attrs.value}, {}, namespace);
      parentElement.insertBefore(node, parentElement.childNodes[index] || null)
    }
    else {
      node = cached.nodes[0];
      if (dataAttrKeys.length) setAttributes(node, data.tag, data.attrs, cached.attrs, namespace);
      cached.children = build(node, data.tag, undefined, undefined, data.children, cached.children, false, 0, data.attrs.contenteditable ? node : editable, namespace, configs);
      cached.nodes.intact = true;
      if (shouldReattach === true && node != null) parentElement.insertBefore(node, parentElement.childNodes[index] || null)
    }
    //schedule configs to be called. They are called after `build` finishes running
    if (typeof data.attrs["config"] == sFn) {
      var context = cached.configContext = cached.configContext || {};

      // bind
      var callback = function(data, args) {
        return function() {
          return data.attrs["config"].apply(data, args)
        }
      };
      configs.push(callback(data, [node, !isNew, context, cached]))
    }
  }
  else if (typeof dataType != sFn) {
    //handle text nodes
    var nodes;
    if (cached.nodes.length === 0) {
      if (data.$trusted) {
        nodes = injectHTML(parentElement, index, data)
      }
      else {
        nodes = [$document.createTextNode(data)];
        if (!parentElement.nodeName.match(voidElements)) parentElement.insertBefore(nodes[0], parentElement.childNodes[index] || null)
      }
      cached = "string number boolean".indexOf(typeof data) > -1 ? new data.constructor(data) : data;
      cached.nodes = nodes
    }
    else if (cached.valueOf() !== data.valueOf() || shouldReattach === true) {
      nodes = cached.nodes;
      if (!editable || editable !== $document.activeElement) {
        if (data.$trusted) {
          clear(nodes, cached);
          nodes = injectHTML(parentElement, index, data)
        }
        else {
          //corner case: replacing the nodeValue of a text node that is a child of a textarea/contenteditable doesn't work
          //we need to update the value property of the parent textarea or the innerHTML of the contenteditable element instead
          if (parentTag === "textarea") parentElement.value = data;
          else if (editable) editable.innerHTML = data;
          else {
            if (nodes[0].nodeType == 1 || nodes.length > 1) { //was a trusted string
              clear(cached.nodes, cached);
              nodes = [$document.createTextNode(data)]
            }
            parentElement.insertBefore(nodes[0], parentElement.childNodes[index] || null);
            nodes[0].nodeValue = data
          }
        }
      }
      cached = new data.constructor(data);
      cached.nodes = nodes
    }
    else cached.nodes.intact = true
  }

  return cached
}


function setAttributes(node, tag, dataAttrs, cachedAttrs, namespace) {
  for (var attrName in dataAttrs) {
    var dataAttr = dataAttrs[attrName];
    var cachedAttr = cachedAttrs[attrName];
    if (!(attrName in cachedAttrs) || (cachedAttr !== dataAttr)) {
      cachedAttrs[attrName] = dataAttr;
      try {
        //`config` isn't a real attributes, so ignore it
        //we don't ignore `key` because it must be unique and having it on the DOM helps debugging
        if (attrName === "config") continue;
        //hook event handlers to the auto-redrawing system
        else if (typeof dataAttr == sFn && attrName.indexOf("on") == 0) {
          node[attrName] = autoredraw(dataAttr, node)
        }
        //handle `style: {...}`
        else if (attrName === "style" && dataAttr != null && type.call(dataAttr) == Types.sObj) {
          for (var rule in dataAttr) {
            if (cachedAttr == null || cachedAttr[rule] !== dataAttr[rule]) node.style[rule] = dataAttr[rule]
          }
          for (var rule in cachedAttr) {
            if (!(rule in dataAttr)) node.style[rule] = ""
          }
        }
        //handle SVG
        else if (namespace != null) {
          if (attrName === "href") node.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataAttr);
          else if (attrName === "className") node.setAttribute("class", dataAttr);
          else node.setAttribute(attrName, dataAttr)
        }
        //handle cases that are properties (but ignore cases where we should use setAttribute instead)
        //- list and form are typically used as strings, but are DOM element references in js
        //- when using CSS selectors (e.g. `m("[style='']")`), style is used as a string, but it's an object in js
        else if (attrName in node && !(attrName == "list" || attrName == "style" || attrName == "form")) {
          node[attrName] = dataAttr
        }
        else node.setAttribute(attrName, dataAttr)
      }
      catch (e) {
        //swallow IE's invalid argument errors to mimic HTML's fallback-to-doing-nothing-on-invalid-attributes behavior
        if (e.message.indexOf("Invalid argument") < 0) throw e
      }
    }
    else if (attrName === "value" && tag === "input" && node.value !== dataAttr) {
      node.value = dataAttr
    }
  }
  return cachedAttrs
}

function injectHTML(parentElement, index, data) {
  var nextSibling = parentElement.childNodes[index];
  if (nextSibling) {
    var isElement = nextSibling.nodeType != 1;
    var placeholder = $document.createElement("span");
    if (isElement) {
      parentElement.insertBefore(placeholder, nextSibling || null);
      placeholder.insertAdjacentHTML("beforebegin", data);
      parentElement.removeChild(placeholder)
    }
    else nextSibling.insertAdjacentHTML("beforebegin", data)
  }
  else parentElement.insertAdjacentHTML("beforeend", data);
  var nodes = [];
  while (parentElement.childNodes[index] !== nextSibling) {
    nodes.push(parentElement.childNodes[index]);
    index++
  }
  return nodes
}
function flatten(data) {
  //recursive flatten
  for (var i = 0; i < data.length; i++) {
    if (type.call(data[i]) == sArr) {
      data = data.concat.apply([], data);
      i-- //check current index again and flatten until there are no more nested arrays at that index
    }
  }
  return data
}
function autoredraw(callback, object) {
  return function(e) {
    e = e || event;
    m.redraw.strategy("diff");
    m.computation.start();
    try {return callback.call(object, e)}
    finally {
      m.computation.end()
    }
  }
}
