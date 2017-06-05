const Nodis = require('../lib/nodis');

const nodis = new Nodis({
  zk: {
    connect: '192.168.10.85:2181',
    path: '/zk/codis/db_bi_test/proxy'
  },
  client: {
    'return_buffers': true
  }
})


nodis.on(nodis.ZK_CONNECT, zk => {
  nodis.getResource().then(client => {
    
    client.hmset('foobar', {'foo': new Buffer('bar')}, (err, data) => {
      client.hgetall('foo', (err, data) => {
        console.log(data)
      })
    })
  })
})