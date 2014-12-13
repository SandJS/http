/**
 * Author:    Adam Jaso <ajaso@pocketly.com>
 * Copyright: 2014 Pocketly
 */ 

var _ = require('lodash');


exports = module.exports = require('../..').Controller.extend({
  routes: {
    '/': function(req, res) {
      res.json({error: false});
    },

    'post /save': function(req, res) {
      res.json({error: false});
    },

    'PUT /save': function(req, res) {

    },

    '/user': {
      get: function(req, res) {
        res.json({error: false});
      },
      put: function(req, res) {
        res.json({error: false});
      },
      post: function(req, res) {
        res.json({error: false});
      }
    },

    '/xyz': {
      GET: function(req, res) {
        res.json({error: false});
      },

      POST: function(req, res) {
        res.json({error: false});
      }
    }
  }
});