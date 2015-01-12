/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2014 Pocketly
 */ 


exports = module.exports = require('../..').Controller.extend({
  '/domain': function(req, res) {
    res.send(process.domain ? '1' : '0');
  }
});