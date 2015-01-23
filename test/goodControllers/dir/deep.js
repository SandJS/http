var _ = require('lodash');


exports = module.exports = require('../../..').Controller.extend({
  '/deep': response
});

function response(req, res) {
  res.json({error: false, policyName: req.policyName});
}