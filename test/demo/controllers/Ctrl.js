/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 


module.exports = require('../../..').Controller.extend({
  '/': function(req, res) {
    res.status(200).send(':)');
  }
});