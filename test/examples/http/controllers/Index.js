"use strict";

var BaseController = require('./BaseController');

class Index extends BaseController {
  static index(req, res) {
    this.send('index');
  }

  static test(req, res) {
    this.send('test');
  }

  static multiGet(req, res) {
    this.send('multiGet');
  }

  static multiPost(req, res) {
    this.send('multiPost');
  }

  static denyRoute() {
    // Shouldn't get here
    this.send('denyRoute');
  }

  static view() {
    //this.res.send('ok');
    this.render('test');
  }
}

module.exports = Index;