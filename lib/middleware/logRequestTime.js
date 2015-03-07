"use strict";

module.exports = function(http) {
  let logRoute = http.log.as('http:route');
  /**
   * Save the request start time
   * and listen for request finish event
   */
  return function(req, res, next) {
    if (!http.config.logRequests.enabled) {
      return next()
    }

    // Save the Request Start Time
    req.requestStartTime = new Date();

    require('on-finished')(req, logRequest);
    next();
  };

  /**
   * Log the request time when finished
   *
   * @param {null|Error} err - Request error if there was one
   * @param {Request} req - Request Object
   */
  function logRequest(err, req) {
    if (req) {
      let ms = new Date() - req.requestStartTime;

      var time = ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(2)}s`;

      logRoute(`${req.method} (${time}) ${req.res.statusCode}: ${req.url}`);
    }
  }
};