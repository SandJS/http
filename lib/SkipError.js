"use strict";

class SkipError extends Error {
  constructor(message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.skip = true;
  }
}

module.exports = SkipError;