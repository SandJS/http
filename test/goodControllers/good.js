/**
 * Author:    Adam Jaso <ajaso@pocketly.com>
 * Copyright: 2014 Pocketly
 */ 

var _ = require('lodash');


exports = module.exports = require('../..').Controller.extend({

  policies: {
    '/': 'public'
  },

  before: function(req, res, next) {
    req.policyName = 'before';
    next();
  },

  public: function(req, res, next) {
    req.policyName = 'public';
    next();
  },

  '/': response,

  'post /save': response,

  'PUT /save': response,

  '/user': {
    get: response,
    put: response,
    post: response
  },

  '/xyz': {
    GET: response,

    POST: response
  }
});

function response(req, res) {
  res.json({error: false, policyName: req.policyName});
}