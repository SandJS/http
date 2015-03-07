"use strict";

class BaseController extends Controller {
  static before(next) {
    this.ranBefore = true;

    if ('denyRoute' === this.actionName) {
      this.notAuthorized('Denied');
    }

    next();
  }
}

module.exports = BaseController;