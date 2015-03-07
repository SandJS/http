var domain = require('domain');

module.exports = function(http) {
  /**
   * Creates a New Domain and registers
   * events on it, you can access
   * request context by using process.domain
   * this will be @deprecated at some point
   * once there is a better solution
   */
  return function registerDomain(req, res, next) {
    var requestDomain = domain.create();

    requestDomain.add(req);
    requestDomain.add(res);

    // this is necessary for access via process.domain
    requestDomain.req = req;
    requestDomain.res = res;

    // handle uncaught exceptions
    requestDomain.on('error', function (err) {
      http.log(err.stack || err);

      // try to send a 500 response to the client
      try {
        // send 500 response
        if (!res.headersSent) {
          //res.serverError();
          res.status(500).send('Internal Error');
        }
      } catch (err2) {
        http.log('Error sending 500 response', err2.stack || err2);
      }
    });

    requestDomain.run(next);
  };
};