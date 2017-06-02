const Zookeeper = require('zookeeper');

class Zk extends Zookeeper {
  constructor(...args) {
    super(...args);
  }
  watchGetChildren(path, cb) {
    this.aw_get_children2(path, (type, stat, path) => {
      if (type === Zookeeper.ZOO_CHILD_EVENT) {
        this.watchGetChildren(path, cb);
      }
    }, (rc, error, children, stat) => {
      cb(rc, children);
    });
  }
  watchGet(path, cb) {
    this.aw_get(path, (type, stat, path) => {
      if (type === Zookeeper.ZOO_CHANGED_EVENT) {
        this.watchGet(path, cb);
      }
    }, (rc, error, stat, data) => {
      cb(rc, data);
    })
  }
}

module.exports = Zk;
