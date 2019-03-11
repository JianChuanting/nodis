const net = require('net');
net.createServer((socket) => {
  const des = net.connect(2181, '127.0.0.1', () => {
    socket.pipe(des);
    des.pipe(socket);
    des.on('error', console.error);
  })
}).listen(2182, () => {
  console.log('listen to 2182')
})