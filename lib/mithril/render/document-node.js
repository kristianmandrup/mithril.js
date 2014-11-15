var html;
module.exports = {
  appendChild: function(node) {
    if (html === undefined) html = $document.createElement("html");
    if ($document.documentElement && $document.documentElement !== node) {
      $document.replaceChild(node, $document.documentElement)
    }
    else $document.appendChild(node);
    this.childNodes = $document.childNodes
  },
  insertBefore: function(node) {
    this.appendChild(node)
  },
  childNodes: []
};
