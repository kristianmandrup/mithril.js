module.exports = function(prop, withAttrCallback) {
  return function(e) {
    e = e || event;
    var currentTarget = e.currentTarget || this;
    withAttrCallback(prop in currentTarget ? currentTarget[prop] : currentTarget.getAttribute(prop))
  }
};
