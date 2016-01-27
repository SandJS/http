"use strict";

class ServerError extends HttpError {
  constructor(message, logMessage) {
    super(500, message, logMessage);
  }
}

module.exports = ServerError;