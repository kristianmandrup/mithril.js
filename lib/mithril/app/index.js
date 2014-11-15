var di = require('./di')

module.exports = {
  module:  require('./module')
  factory: di.factory,
  resolve: di.resolve
}
