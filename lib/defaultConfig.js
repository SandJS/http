module.exports = {
  controllerPath: '/controllers',
  policyFile: '/policies/policies',
  view: {
    path: '/views',
    layoutPath: '/views/layout',
    layout: false,
    enabled: true,
    engine: 'ejs'
  },
  port: 3000,
  logRequests: {
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
   * Must be a function with 1 parameter being
   * express, not traditional middleware
   */
  afterMiddleware: null
};