"use strict";

class HttpError extends GeneralError {
  constructor(statusCode, message, logMessage) {
    super((message || 'Internal Server Error'), logMessage);
    this.statusCode = statusCode || 500;
  }
}

module.exports = HttpError;