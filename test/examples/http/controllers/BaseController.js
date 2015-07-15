"use strict";

class BaseController extends Controller {
  static *before() {
    this.ranBefore = true;

    if ('denyRoute' === this.actionName) {
      this.notAuthorized('Denied');
    }
  }
}

module.exports = BaseController;