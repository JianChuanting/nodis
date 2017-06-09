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
  let i = 0;
  while ( i++ < 10 ) {
    nodis.getResource().then(client => console.log('codis client'))  
  }
  nodis.getResource().then(client => {
    let i = 0;    
    while ( i++ < 10 ) {
      nodis.getResource().then(client => console.log('codis client'))  
    }
    client.hmset('foobar', {'foo': new Buffer('bar')}, (err, data) => {
      client.hgetall('foobar', (err, data) => {
        console.log(data)
      })
    })
  })
})