"use strict";

var session = require('express-session');

module.exports = function(http) {
  if (http.config.session) {
    var sessionConfig = http.config.session;

    if ('undefined' !== typeof sand.session) {
      session.Store.call(sand.session);
      sessionConfig.store = sand.session;

      // Need to extend session store
      for(var fn in session.Store.prototype) {
        if (session.Store.prototype.hasOwnProperty(fn)) {
          sand.session[fn] = session.Store.prototype[fn];
        }
      }
    }

    http.app.use(session(sessionConfig));
  }
};