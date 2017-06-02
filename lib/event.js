const Events = require('events')

class NodisEvent extends Events {
  constructor () {
    super();
  }
}

Object.assign(NodisEvent, {
  ZK_CONNECT: 'zk_connect'
})

module.exports = NodisEvent;