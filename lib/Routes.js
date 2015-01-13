/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */


var Class = require('sand').Class;
var _ = require('lodash');
var async = require('async');
var errors = require('common-errors');

module.exports = exports = Class.extend({

  construct: function() {
    this.routes = {};
  },

  parseRoute: function(controller, route) {
    if (!route || !route.trim()) {
      throw new errors.ArgumentError('Empty string is an invalid route: in "' + controller.file + '"');
    }

    var methods = controller[route];
    var split = route.split(' ');

    if (split.length == 1) {

      this.parseRouteWithPathOnly(controller, route, split[0], methods);

    } else if (split.length >= 2) {

      this.addRoute(controller, route, split[0], split[1], methods);

    } else {
      throw new errors.ArgumentError('Invalid route given: "' + route + '"');
    }

  },

  /**
   *
   * @param controller
   * @param route
   * @param path
   * @param methods
   */
  parseRouteWithPathOnly: function parseRouteWithPathOnly(controller, route, path, methods) {

    if ('object' === typeof methods) {

      if (_.isEmpty(methods)) {
        throw new errors.NotFoundError('No action specified for route: "' + route + '" in file "' + controller.file + '"');
      }

      for (var method in methods) {
        if (methods.hasOwnProperty(method)) {
          this.addRoute(controller, route, method, path, methods[method]);
        }
      }

    } else if ('function' === typeof methods) {
      this.addRoute(controller, route, 'get', path, methods);

    } else {
      throw new errors.TypeError('The given path "' + route + '" must map to an action function OR an object with properties of valid HTTP methods mapped to action functions. Unsupported action type given: ' + typeof methods);
    }
  },

  /**
   * Validates a route's method, path and action and adds them to the route list
   *
   * @param controller
   * @param route
   * @param method {string}
   * @param path {string}
   * @param action {function}
   * @throws
   *  ArgumentError: invalid path (empty string)
   *  TypeError: invalid ctrl/action type (function required)
   *  NotSupportedError: invalid HTTP methods
   *  AlreadyInUseError: route is already registered
   */
  addRoute: function addRoute(controller, route, method, path, action) {

    if (!validatePath(path)) {
      throw new errors.NotFoundError('Path not specified for route "' + route + '"');
    }

    if ('function' !== typeof action) {
      throw new errors.TypeError('Invalid action of type "' + typeof action + '" given for route "' + route + '" in file "' + controller.file + '"');
    }

    if (!exports.validateHttpMethod(method)) {
      throw new errors.NotSupportedError('Invalid HTTP method: ' + method);
    }

    method = method.trim().toLowerCase();
    path = path.trim();

    // if this method does not exist, add a container for it
    if (!this.routes[method]) {
      this.routes[method] = {};
    }

    // if this route is already registered, then throw an error
    if ('undefined' !== typeof this.routes[method][path]) {
      throw new errors.AlreadyInUseError('Route "' + method + ' ' + path + '" is already registered in "' +  this.routes[method][path].file + '"');
    }

    this.routes[method][path] = {
      file: controller.file,
      action: createAction(method, path, action)
    };

    // builds an action function that calls the policy function and then the action function
    function createAction(method, path, action) {
      var policy = getPolicy(method, path);
      return function(req, res) {
        policy.call(controller, req, res, function(data) {
          action.call(controller, req, res);
        });
      };
    }

    // loads a policy for the given method and path
    function getPolicy(method, path) {
      var policyKey = method.toLowerCase() + ' ' + path;
      var policy = controller.policies[policyKey];

      switch (typeof policy) {
        case 'string':
          if (!_.isFunction(controller[policy])) {
            throw new errors.NotFoundError('Policy "' + policy + '" was not found for "' + policyKey + '" in ' + controller.file);

          } else {
            return controller[policy];
          }

        case 'function':
          return policy;

        default:
          return controller.before;
      }
    }
  }

});

exports.validateHttpMethod = function validateHttpMethod(method) {
  if (!method) {
    return false;
  }
  method = method.trim().toLowerCase();
  return -1 !== _.indexOf(['get', 'post', 'put', 'delete', 'all', 'head', 'options'], method);
};


function validatePath(path) {
  return path.trim();
}