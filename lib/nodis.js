const Event = require('./event');
const Zookeeper = require('./zk');
const redis = require('redis');

let logger;

class Nodis extends Event {
  constructor(options) {
    super();
    const self = this;
    self.options = options;
    logger = options.logger || console;
    
    const zkOpts = options.zk;
    const clientOpts = options.client;
    delete clientOpts.host;
    delete clientOpts.port;
    delete clientOpts.url;
    const path = options.zk.path;

    self._proxyCfg = {};
    self._resources = [];
    self._getResourceQueue = [];
    self.lastProxies = [];  
    self._connected = false; 
    
    self._zk = null;
    this._connect(zkOpts, path, clientOpts);
  }
  _connect(zkOpts, path, clientOpts){
    const self = this;
    if(self._zk){
      self._zk.close();
    }
    const zk = self._zk = new Zookeeper(zkOpts);
    zk.once('close', () => {
      self._connect(zkOpts, path, clientOpts)
    })
    zk.connect(err => {
      if (err) {
        return logger.error('Connect to zk failed.')
      };
      if (!self._connected) {
        self._connected = true;
        logger.log('Connect to zk successfully.')
        self.emit(self.ZK_CONNECT, zk);
      } else {
        logger.log('Reconnect to zk successfully.')
        self.emit(self.ZK_RECONNECT, zk);
      }
      zk.watchGetChildren(path, (err, data) => {
        if (err) {
          logger.error('Zk error', err)
          return;
        }
        logger.log('Codis porxy found.', data.length, data.join());
        const toCreate = data.filter(c => self.lastProxies.indexOf(c) < 0)        
        const toDelete = self.lastProxies.filter(c => data.indexOf(c) < 0)
        self.lastProxies = data;
        toDelete.forEach(proxy => {
          // delete proxy
          logger.log('Disconnect client',proxy, self._proxyCfg[proxy] && self._proxyCfg[proxy].addr)          
          const removed = self.removeResource(proxy);
          delete self._proxyCfg[proxy]
          removed && removed.quit();
        })

        toCreate.forEach(proxy => {
          const childPath =  path + '/' + proxy
          zk.watchGet(childPath, (err, data) => {
            if (err) {
              logger.error('Zk error', err)
              return;
            } 
            try {
              const cfg = JSON.parse(data.toString());
              const oldClient = self.removeResource(proxy);
              if (oldClient) {
                logger.log('Disconnect client', proxy, self._proxyCfg[proxy] && self._proxyCfg[proxy].addr)
                oldClient.quit();
              }
              logger.log('Connect to codis', proxy, cfg.addr);
              const client = redis.createClient(Object.assign(clientOpts, {
                url: `redis://${cfg.addr}`
              }));
              client.on('error', err => logger.error('Client error', err))
              client.id = proxy;
              self.addResource(client)
              self._proxyCfg[proxy] = cfg
            } catch (e) {
              logger.error('Connect codis failed', e);
            }
          })
        })
      });
    });
  }
  addResource(resource) {
    this._resources.push(resource);
    if (this._getResourceQueue.length) {
      process.nextTick(() => {
        this.getResource().then(this._getResourceQueue.shift())
      })
    }
  }
  getResource() {
    if (this._resources && this._resources.length) {
      const resource = this._resources.shift();
      this.addResource(resource);
      const prm = new Promise((resolve, reject) => resolve(resource));
      // prm.then(resource => this.addResource(resource));
      return prm;
    } else {
      logger.warn('No Codis Client Connected.');      
      const prm = new Promise(resolve => this._getResourceQueue.push(resource => {
        // logger.log('Get codis proxy. queue length', this._getResourceQueue.length);
        resolve(resource);
      }))
      return prm
    }
  }
  removeResource(id) {
    // remove resource by id;
    const idx = this._resources.findIndex(r => r.id === id);
    if(idx > -1) {
      return this._resources.splice(idx, 1)[0];
    } else {
      return null;
    }
  }
}


module.exports = Nodis;
