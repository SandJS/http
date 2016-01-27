"use strict";

class ConflictError extends HttpError {
  constructor(message, logMessage) {
    super(409, message, logMessage);
  }
}

module.exports = ConflictError;