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
    
    const zkOpts = self._zkOpts = options.zk;
    const clientOpts = self._clientOpts = options.client;
    delete clientOpts.host;
    delete clientOpts.port;
    delete clientOpts.url;
    const zk = self._zk = new Zookeeper(zkOpts);
    const path = self._path = options.zk.path;
    const proxyCfg = self._proxyCfg = {};

    self._resources = [];
    self._getResourceQueue = [];
    self.lastProxies = [];   
    zk.connect(err => {
      if (err) {
        return logger.error('Connect to zk failed.')
      };
      logger.log('Connect to zk successfully.')
      self.emit(self.ZK_CONNECT, zk);
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
          logger.log('Disconnect client',proxy, proxyCfg[proxy].addr)          
          const removed = self.removeResource(proxy);
          delete proxyCfg[proxy]
          removed.quit();
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
                logger.log('Disconnect client',proxy, proxyCfg[proxy].addr)
                oldClient.quit();
              }
              logger.log('Connect to codis', proxy, cfg.addr);
              const client = redis.createClient({
                url: `redis://${cfg.addr}`
              });
              client.on('error', err => logger.error('Client error', err))
              client.id = proxy;
              self.addResource(client)
              proxyCfg[proxy] = cfg
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
      logger.log('Wait codis proxy. queue length', this._getResourceQueue.length);
      process.nextTick(() => {
        this.getResource().then(this._getResourceQueue.shift())
      })
    }
  }
  getResource() {
    if (this._resources && this._resources.length) {
      const resource = this._resources.shift();
      const prm = new Promise((resolve, reject) => resolve(resource));
      prm.then(resource => this.addResource(resource));
      return prm;
    } else {
      const prm = new Promise(resolve => this._getResourceQueue.push(resource => {
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
