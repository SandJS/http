
var db = {};

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
   * Must be a function with 1 parameter being
   * express, not traditional middleware
   */
  beforeMiddleware: null,

  /**
   * Adaptive Image Settings
   */
  ai: {

    /**
     * Indicates whether to use caching
     */
    useCache: false,

    /**
     * Web accessible directory from which to read images relative to project root (i.e. sand.appPath)
     */
    imagesDir: 'public/img',

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
      db[key] = buf;
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
      callback(null, db[key]);
    }
  }
};