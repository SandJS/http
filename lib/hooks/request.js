var _ = require('lodash');

exports = module.exports = function(config) {
  return function(req, res, next) {
    mixinResNotFound(req, res);
    mixinBadRequest(req, res);
    mixinResServerError(req, res);
    mixinResForbidden(req, res);
    mixResNotAuthorized(req, res);

    next();
  };

  /**
   * res.notFound()
   * Mixin for 404 Not Found
   *
   * responds with config/404.js
   *
   * @param {Request} req
   * @param {Response} res
   * @private
   */
  function mixinResNotFound(req, res) {
    "use strict";

    res.notFound = function respond404(data) {
      sendResponse(res, 404, 'Not Found', data);
    };
  }

  /**
   * res.serverError()
   * Mixin for 500 Server Error
   *
   * responds with config/500.js
   *
   * @param {Request} req
   * @param {Response} res
   * @private
   */
  function mixinResServerError(req, res) {
    "use strict";

    /**
     * Calls 500 error function
     *
     * @param {Object} [data] to send to 500 page
     */
    res.serverError = function respond500(data) {
      sendResponse(res, 500, 'Internal Server Error', data);
    };
  }

  /**
   * res.forbidden()
   * Mixin for 403 and 401 Requests
   *
   * responds with config/403.js
   *
   * @param {Request} req
   * @param {Response} res
   * @private
   */
  function mixinResForbidden(req, res) {
    "use strict";

    /**
     * Calls 403 Function
     * @param {String} [message]
     * @param {Object} [data]
     */
    res.forbidden = function respond403(message, data) {
      message = message || 'Forbidden';

      sendResponse(res, 403, message, data);
    };
  }

  /**
   * res.notAuthorized()
   * Mixin for 401 Requests
   *
   * @param {Request} req
   * @param {Response} res
   * @private
   */
  function mixResNotAuthorized(req, res) {
    "use strict";

    /**
     * Calls 401 Function
     * @param {String} [message]
     * @param {Object} [data]
     */
    res.notAuthorized = function respond403(message, data) {
      message = message || 'Not Authorized';

      sendResponse(res, 401, message, data);
    };
  }

  /**
   * res.badRequest()
   * Mixin for 400 Bad Requests
   *
   * responds with config/400.js
   *
   * @param {Request} req
   * @param {Response} res
   * @private
   */
  function mixinBadRequest(req, res) {
    "use strict";

    /**
     * Calls 400 Function
     * @param {String|Object} [response]
     * @param {Object} [data]
     */
    res.badRequest = function respond400(response, data) {
      response = response || 'Bad Request';
      sendResponse(res, 400, response, data)
    };
  }

  function sendResponse(res, code, fallbackText, data) {
    data = data || {};

    if (_.isString(config[code])) {
      res.status(code).render(config[code], data);
    } else {
      res.status(code).send(fallbackText);
    }
  }
};