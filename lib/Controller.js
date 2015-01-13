/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @author Kevin Smithson <ksmithson@pocketly.com>
 * @copyright 2014 Pocketly
 */

var _ = require('lodash');
var Class = require('sand').Class;
var Http = require('./Http');
var Routes = require('./Routes');

module.exports = exports = Class.extend({

  policies: {},

  construct: function(file) {
    this.file = file;
  },

  before: function(req, res, next) {
    next();
  },

  normalizePolicies: function() {

    if (_.isPlainObject(this.policies)) {
      _.each(this.policies, function (policyHandler, policyRoute) {
        if (exports.isValidRoute(policyRoute)) {
          var split = policyRoute.split(' ');
          delete this.policies[policyRoute];

          var method = null;
          if (1 == split.length) {
            method = 'get';

          } else if (2 <= split.length) {
            method = split[0];
            policyRoute = split[1];
          }

          if (method) {
            method = method.toLowerCase();
            Routes.validateHttpMethod(method);
            policyRoute = method + ' ' + policyRoute;
            this.policies[policyRoute] = policyHandler;
          }
        }
      }.bind(this));
    }
  },

  normalizeRoutes: function normalizeRoutes(routes) {
    this.normalizePolicies();

    for (var route in this) {
      //console.log(route, controller.hasOwnProperty(route), controller[route]);
      if (!route) {
        throw new Error('Empty route: "' + route + '"');

      } else if (exports.isValidRoute(route)) {
        routes.parseRoute(this, route);

      } else if (-1 !== route.indexOf('/')) {
        throw new Error('Invalid route: "' + route + '"');
      }
    }
  }
});

var validRouteMatches = [
  /^(?:(?:get|post|delete|put|head|options|all)\s+)?\/.*$/i
];

exports.isValidRoute = function(route) {
  for (var i in validRouteMatches) {
    if (validRouteMatches.hasOwnProperty(i) && validRouteMatches[i].test(route)) {
      return true;
    }
  }
  return false;
};

exports.CONTENT_HTML = 'text/html';
exports.CONTENT_JSON = 'application/json';