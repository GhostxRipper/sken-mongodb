/* Service requiring */
const MongoClient = require('mongodb').MongoClient;
const debug = require('debug')('Sken:MongoDB');
const MongoFactory = require('./factory');
const Driver = require('sken-config-middleware').Driver;

/* Object declaration */
let configuration = null;
let db = null;

/* Class declaration */
class MongoDB extends Driver {

  static init (config = global.config.databases.mongodb) {
    configuration = config;
    return this._init();
  }

  static _init () {
    const url = `mongodb://${configuration.host}:${configuration.port}/${configuration.schema.name}`;

    const promise = MongoClient.connect(url, configuration.schema.options)
    .then((_db) => {
      db = _db;
      debug(`Connected to database "${configuration.schema.name}"`);

      db.on('error', (err) => {
        debug(`An error occurred:${err}`);
      });

      /* db.on('close', () => {
        db = null;
      }); */

      const factories = this.getFactoriesDirectories();
      let promises = [Promise.resolve()];

      db.collections = {};

      factories.forEach((file) => {
        try {
          const FactoryClass = require(file);
          if (Object.getPrototypeOf(FactoryClass) === MongoFactory) {
            const factory = new FactoryClass();
            promises.push(factory.init(_db));
            db.collections[factory._name] = factory;
          }
        } catch (e) {
          debug(e);
        }
      });

      return Promise.all(promises).catch((err) => debug('MongoFactory error - [%s]', err.message));
    })
  .catch((err) => {
    debug(`"${configuration.schema.name}" does not exists.`);
    debug(err.message);
    return Promise.reject(err);
  });

    return promise;
  }

  static get () {
    return db;
  }
}

/* Module exports */
module.exports = MongoDB;
