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
    engine: 'ejs'
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
  beforeMiddleware: null
};