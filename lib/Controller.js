/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @author Kevin Smithson <ksmithson@pocketly.com>
 * @copyright 2014 Pocketly
 */

var _ = require('lodash');
var Class = require('sand').Class;

module.exports = exports = Class.extend({

  before: function(req, res, next) {
    next();
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