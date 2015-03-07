"use strict";

let BaseController = require('./BaseController');

class Test extends BaseController {

  static before(next) {
    let self = this;
    super.before(function() {
      self.inSecondBefore = true;
      next();
    });
  }

  static named() {
    this.send('test.index');
  }

  static throw500() {
    this.throw('Internal Server Error');
  }

  static verifyBefore() {
    this.send(this.inSecondBefore ? 'yes' : 'no');
  }

  static domain() {
    this.send(process.domain ? 'yes' : 'no');
  }

  static test() {
  }
}

module.exports = Test;