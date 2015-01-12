exports = module.exports = require('../..').Controller.extend({
  routes: {
    '/500': function(req, res) {
      res.serverError();
    },

    '/404': function(req, res) {
      res.notFound();
    },

    '/403': function(req, res) {
      res.forbidden();
    },

    '/401': function(req, res) {
      res.notAuthorized();
    },

    '/400': function(req, res) {
      res.badRequest();
    }
  }
});