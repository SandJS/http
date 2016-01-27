"use strict";

class BadRequestError extends HttpError {
  constructor(message, logMessage) {
    super(400, message, logMessage);
  }
}

module.exports = BadRequestError;