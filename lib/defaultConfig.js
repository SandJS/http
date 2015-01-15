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
  }
};