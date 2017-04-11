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
    res.requestStartTime = new Date();
    res.getTime = function() {
      return (new Date() - res.requestStartTime) / 1000;
    };

    require('on-finished')(res, logRequest);
    next();
  };

  /**
   * Log the request time when finished
   *
   * @param {null|Error} err - Request error if there was one
   * @param {Request} req - Request Object
   */
  function logRequest(err, res) {
    if (res) {
      let ms = new Date() - res.requestStartTime;

      var time = ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(2)}s`;

      logRoute(`${res.req.method} ${res.statusCode} (${time}): ${res.req.originalUrl}`);
    }
  }
};