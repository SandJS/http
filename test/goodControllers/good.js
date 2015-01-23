/**
 * Author:    Adam Jaso <ajaso@pocketly.com>
 * Copyright: 2014 Pocketly
 */ 

var _ = require('lodash');


exports = module.exports = require('../..').Controller.extend({

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
  },

  '/skip/dummy': response,

  '/dual': function(req, res) {
    res.json({
      error: false,
      policy1Name: req.policy1Name,
      policy2Name: req.policy2Name
    });
  }
});

function response(req, res) {
  res.json({error: false, policyName: req.policyName});
}