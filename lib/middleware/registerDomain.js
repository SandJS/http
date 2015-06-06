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

      // try to send a 500 response to the client
      try {
        // send 500 response
        if (!res.headersSent) {
          //res.serverError();
          if ('object' === typeof res.context) {
            // If there is a domain on the error object
            // we need to remove it to prevent circular references
            // when converted to a JSON string
            if (err && err.domain) {
              delete err.domain;
            }
            res.context.onError(err.message || err);
          } else {
            http.log('We didn\'t have a context to throw error on.', err.stack || err);
            res.status(500).send('Internal Error');

            callCustomErrorHandler(err, res.context);
          }

        } else {
          callCustomErrorHandler(err, res.context);
        }
      } catch (err2) {
        http.log('Error sending 500 response', err2.stack || err2);
      }
    });

    requestDomain.run(next);
  };

  function callCustomErrorHandler(err, context) {
    if (_.isFunction(http.config.onError)) {
      http.config.onError(err, context);
    }
  }

};