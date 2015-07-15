"use strict";

class ExitError extends Error {
  constructor(message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.exit = true;
  }
}

module.exports = ExitError;