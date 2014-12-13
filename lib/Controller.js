/**
 * Author:    Adam Jaso <ajaso@pocketly.com>
 * Copyright: 2014 Pocketly
 */

var _ = require('lodash');
var Class = require('sand-extend').Class;

exports = module.exports = Class.extend({

  routes: {
    '/': function(req, res) {
      res.status(200).send('Hello, world!');
    }
  },

  before: function(req, res, next) {
    sand.log('calling before!!!');
    next();
  }

});


exports.CONTENT_HTML = 'text/html';
exports.CONTENT_JSON = 'application/json';