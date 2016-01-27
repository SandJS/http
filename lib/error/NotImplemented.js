"use strict";

class NotImplemented extends GeneralError {
  constructor(message, logMessage) {
    super(message, logMessage);
  }
}

module.exports = NotImplemented;