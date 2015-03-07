"use strict";

class Error extends Controller {
  static throw400() {
    this.badRequest('Missing user id');
  }

  static throw401() {
    this.notAuthorized('No Auth Token');
  }

  static throw403() {
    this.forbidden();
  }

  static throw404() {
    this.notFound();
  }

  static throw500() {
    this.serverError();
  }

  static throw503() {
    this.serviceUnavailable();
  }
}

module.exports = Error;