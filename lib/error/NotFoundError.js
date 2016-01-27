"use strict";

class NotFoundError extends HttpError {
  constructor(message, logMessage) {
    super(404, message, logMessage);
  }
}

module.exports = NotFoundError;