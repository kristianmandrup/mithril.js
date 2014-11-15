var pendingRequests = 0;

module.exports = {
  start: function() {pendingRequests++},

  end: function() {
    pendingRequests = Math.max(pendingRequests - 1, 0);
    if (pendingRequests == 0) m.redraw()
  };

}
