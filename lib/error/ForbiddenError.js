"use strict";

class ForbiddenError extends HttpError {
  constructor(message, logMessage) {
    super(403, message, logMessage);
  }
}

module.exports = ForbiddenError;