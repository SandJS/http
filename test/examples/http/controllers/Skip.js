"use strict";

class Skip extends Controller {

  static *before() {
    this.ranBefore = true;
    this.skip();
  }
}

module.exports = Skip;