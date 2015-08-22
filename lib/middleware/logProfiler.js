"use strict";

module.exports = function(http) {
  let logRoute = http.log.as('http:profiler');
  /**
   * Save the request start time
   * and listen for request finish event
   */
  return function(req, res, next) {
    sand.profiler.logRequest(res);

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
      sand.profiler.logRequest(res);
    }
  }
};