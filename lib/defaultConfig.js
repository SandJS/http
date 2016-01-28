"use strict";

const cache = require('lru-cache')({
  max: 50,
  maxAge: 1000 * 60 * 60
});

module.exports = {
  /**
   * The path for your controllers
   */
  controllerPath: '/controllers',

  /**
   * The path for your routes.js file
   */
  routesPath: '/config/routes',

  /**
   * The folder where to look for static files
   */
  staticFileDirectory: 'public',

  /**
   * View Config Options
   */
  view: {
    /**
     * THe path for your view files
     */
    path: '/views',
    /**
     * The path for your layout files
     */
    layoutPath: '/views/layout',
    /**
     * Default layout file to use
     */
    layout: false,
    /**
     * Are views enabled?
     */
    enabled: true,
    /**
     * Engine to use for view templates
     */
    engine: 'ejs',

    /**
     * Any data / Functions to send to all Views
     * Can be function or object, Function get 1 parameter `context`
     */
    data: {}
  },

  /**
   * Port to listen for incoming http requests
   */
  port: 3000,

  /**
   * Request logging options
   */
  logRequests: {
    /**
     * Should we log requests?
     */
    enabled: true
  },

  /**
   * see https://github.com/indutny/node-spdy
   * for configuration options
   */
  spdy: null,

  /** set a config to include sessions */
  session: null,

  /**
   * Add middleware just before router
   *
   * Must be a function with 1 parameter being
   * express, not traditional middleware
   *
   * @deprecated
   */
  beforeMiddleware: null,

  /**
   * Add any middleware before all else
   * Must be a function with 1 parameter being
   * express, not traditional middleware
   */
  beforeAllMiddleware: null,

  /**
   * Add middleware just before the router
   *
   * Must be a function with 1 parameter being
   * express, not traditional middleware
   */
  beforeRouterMiddleware: null,

  /**
   * Called for all application errors
   *
   * @param err
   * @param ctx
   */
  onError: function(err, ctx) {
    //sand.error(err.message);
  },

  sendErrorResponse: function(err) {
    let self = this;
    let message = err.expose ? err.message : code;
    
    this.res.format({
      'application/json': function() {
        self.json({ error: err });
      },

      'text/html': function() {
        let config = sand.http.config;

        if ('string' === typeof config[err.statusCode]) {
          self.render(config[err.statusCode], err);
        } else if (_.isPlainObject(config[err.statusCode])) {
          self.render(config[err.statusCode].file, config[err.statusCode].data);
        } else {
          self.send(message);
        }
      },

      'text/plain': function() {
        self.send(message);
      }
    });
  },

  /**
   * Adaptive Image Settings
   */
  ai: {

    /**
     * Indicates whether to use caching
     */
    useCache: false,

    /**
     * Indicates whether to use memcache if it's installed (this will override put and get options)
     */
    useMemcache: true,

    /**
     * Web accessible directory from which to read images relative to project root (i.e. sand.appPath)
     */
    imagesDir: 'public',

    /**
     * Cache life seconds
     */
    cacheLife: 1800,

    /**
     * Function for saving images to cache
     *
     * @param key
     * @param buf
     * @param callback
     */
    put: function(key, buf, callback) {
      //var log = sand.http.log.as('http:ai');
      //log('put', key, 'buf.length='+buf.length);
      cache.set(key, buf);
      callback();
    },

    /**
     * Function for retrieving images from cache
     *
     * @param key
     * @param callback
     */
    get: function(key, callback) {
      //var log = sand.http.log.as('http:ai');
      //log('get', key);
      let val = cache.get(key);
      callback(null, val);
    },

    /**
     * Return a stream or null to use default path
     *
     * @param path
     * @returns {null|ReadStream}
     */
    stream: function(path) {
      return null;
    }
  },

  /**
   * Config for body-parser. See docs at https://github.com/expressjs/body-parser
   */
  bodyParser: {

    /**
     * urlencoded config options
     */
    urlencoded: {
      extended: false
    },

    /**
     * json config options
     */
    json: {

    }
  }
};