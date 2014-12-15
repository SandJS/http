/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @author Kevin Smithson <ksmithson@pocketly.com>
 * @copyright 2014 Pocketly
 */

var _ = require('lodash');
var Class = require('sand-extend').Class;

module.exports = Class.extend({

  routes: {
    '/': function(req, res) {
      res.status(200).send('Sand has been successfully installed! :)');
    }
  },

  before: function(req, res, next) {
    next();
  }
});


exports.CONTENT_HTML = 'text/html';
exports.CONTENT_JSON = 'application/json';