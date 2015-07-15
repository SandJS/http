"use strict";

let Skip = require('./Skip');

class TestSkip extends Skip {

  static *before() {
    yield super.before();
    this.inSecondBefore = true;
  }

  static *verifySkip() {
    this.send(this.ranBefore && !this.inSecondBefore ? 'yes' : 'no');
  }
}

module.exports = TestSkip;