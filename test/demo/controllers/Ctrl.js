/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 


module.exports = require('../../..').Controller.extend({
  '/': function(req, res) {
    console.log('isSpdy', res.isSpdy);
    res.status(200).send(':)');
  }
});