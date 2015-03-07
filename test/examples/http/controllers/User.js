"use strict";

class User extends Controller {
  static index() {
    this.send('User.index');
  }
}

module.exports = User;