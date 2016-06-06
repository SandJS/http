"use strict";

const _ = require('lodash');
const $ = require('sand-dollar');

class GeneralError extends Error {
  /**
   * Create and error with a message and optional message to log
   *
   * @param {string} message - the user friendly error message
   * @param {string|bool} logMessage - a message to log if string, or logs the message if true
   */
  constructor(message, logMessage) {
    super();
    if (message instanceof Error) {
      _.extend(this, $.transgress(message));
    } else {
      if (_.isArray(message)) {
        this.message = message.join('\n');
      } else {
        this.message = message;
      }
    }

    if ('test' !== sand.env) {
      if ('string' === typeof logMessage) {
        sand.error(logMessage);
      } else if (true === typeof logMessage) {
        sand.error(message);
      }
    }

    Object.defineProperty(this, 'expose', {
      enumerable: false,
      writable: true,
      value: true
    });
  }
}

module.exports = GeneralError;