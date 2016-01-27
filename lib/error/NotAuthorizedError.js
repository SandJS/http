"use strict";

class NotAuthorizedError extends HttpError {
  constructor(message, logMessage) {
    super(401, message, logMessage);
  }
}

module.exports = NotAuthorizedError;