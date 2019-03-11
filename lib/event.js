const Events = require('events')

class NodisEvent extends Events {
  constructor () {
    super();
    Object.assign(this, {
      ZK_CONNECT: 'zk_connect',
      ZK_RECONNECT: 'zk_reconnect'
    })
  }
}

module.exports = NodisEvent;