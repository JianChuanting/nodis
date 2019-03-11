const Nodis = require('../lib/nodis');

const nodis = new Nodis({
  zk: {
    connect: '127.0.0.1:2182',
    // path: '/zk/codis/db_codis-server/proxy',
    path: '/test',
    timeout:1000,
  },
  client: {
    'return_buffers': false
  }
})


nodis.on(nodis.ZK_CONNECT, zk => {
  let i = 0;
  while ( i++ < 10 ) {
    nodis.getResource().then(client => console.log('codis client'))  
  }
  setInterval(() => {
    
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
  }, 3000)
 
})