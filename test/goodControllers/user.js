/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2014 Pocketly
 */

exports = module.exports = require('../..').Controller.extend({
  routes: {
    '/123': function(req, res) {
      res.json({error: false});
    },

    'put /': function(req, res) {
      res.json({error: false});
    },

    '/user': {
      delete: function(req, res) {
        res.json({error: false});
      }
    }
  }
});
