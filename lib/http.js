/**
 * Module Dependencies
 */
var SandGrain = require('sand-grain');
var express = require('express');
var _ = require('lodash');
var errors = require('common-errors');
var fs = require('fs');
var domain = require('domain');

/**
 * Expose `HTTP`
 */
exports = module.exports = SandGrain.extend({
  name: 'http',

  construct: function() {
    this.super();

    this.defaultConfig = require('./defaultConfig');

    this.express = null;
    this.server = null;
    this.routes = {};
    this.controllers = {};
  },

  init: function(config, done) {
    this.super(config);

    this.controllerPath = sand.appPath + this.config.controllerPath;

    this.log('Initializing...');

    this.express = express();

    // setup process.domain
    this.express.use(registerDomain);

    this.express.use(this.timerMiddleware.bind(this));
    this.emit('router:before', this.express);
    this.loadControllers();
    this.emit('router:after', this.express);
    this.server = this.express.listen(this.config.port, function() {
      this.log('Listening on ' + this.config.port);
      done();
    }.bind(this));

    return this;
  },


  shutdown: function(done) {
    this.log("Shutting down server");
    this.server.close(done);
  },


  /**
   * load all controller files
   * recursively looks in the
   * config.controllerPath folder
   */
  loadControllers: function loadControllers() {

    if (!fs.existsSync(this.controllerPath)) {
      this.log("WARN: Missing Controllers directory. Skipping loading of files...");
      return;
    }

    var files = require('require-all')({
      dirname: this.controllerPath,
      filter: /(\w+)\.js/
    });

    var path;

    for (var controllerName in files) {

      if (files.hasOwnProperty(controllerName)) {
        var file = this.controllerPath + '/' + controllerName + '.js';

        this.controllers[this.controllerPath + '/' + controllerName + '.js'] = files[controllerName];

        var controller = files[controllerName];
        var ctrl = new controller();
        ctrl.file = file;
        this.mapController(ctrl);
      }
    }

    var log = this.log.as('http:route');
    for (var method in this.routes) {
      if (this.routes.hasOwnProperty(method)) {

        for (path in this.routes[method]) {
          if (this.routes[method].hasOwnProperty(path)) {

            var details = this.routes[method][path];
            log('Mapping: ' + method.toUpperCase() + ' ' + path);
            this.express[method](path, details.action);
          }
        }
      }
    }

  },


  /**
   * Parse controller for routes and actions
   *
   * @param controller object containing routes mapped to actions
   * @param controllerFile string
   */
  mapController: function mapController(controller) {
    var routes = controller.routes;
    for (var route in routes) {
      if (routes.hasOwnProperty(route)) {
        this.parseRoute(controller, route, routes[route]);
      }
    }
  },


  /**
   * Parses the route string into method and path and registers the route
   *
   * @param controllerFile string
   * @param route string
   * @param methods function OR object
   * @throws
   *  ArgumentError: invalid route
   *  NotFoundError: no action given for route
   *  TypeError: action has invalid type
   */
  parseRoute: function parseRoute(controller, route, methods) {
    var controllerFile = controller.file;

    route = route.trim();

    if (!route) {
      throw new errors.ArgumentError('Empty string is an invalid route: in "' + controllerFile + '"');
    }

    var split = route.split(' ');

    if (split.length == 1) {

      if (typeof methods === 'object') {

        if (_.isEmpty(methods)) {
          throw new errors.NotFoundError('No action specified for path: "' + route + '" in file "' + controllerFile + '"');
        }

        for (var method in methods) {

          if (methods.hasOwnProperty(method)) {
            this.addRoute(controller, method, validatePath(split[0]), methods[method]);
          }
        }

      } else if (typeof methods === 'function') {
        this.addRoute(controller, 'get', validatePath(split[0]), methods);

      } else {
        throw new errors.TypeError('The given path "' + route + '" must map to an action function OR an object with properties of valid HTTP methods mapped to action functions. Unsupported action type given: ' + typeof methods);
      }

    } else if (split.length >= 2) {

      if (typeof methods === 'function') {
        this.addRoute(controller, split[0], validatePath(split[1]), methods);

      } else {
        throw new errors.TypeError('Invalid action of type "' + typeof methods + '" given for pattern "method /path"');
      }

    } else {
      throw new errors.ArgumentError('Invalid route given: "' + route + '"');
    }

    function validatePath(path) {
      path = path.trim();
      if (!path) {
        throw new errors.NotFoundError('Path not specified for route "' + route + '"');
      }
      return path;
    }
  },


  /**
   * Validates a route's method, path and action and adds them to the route list
   *
   * @param controllerFile string
   * @param method string
   * @param path string
   * @param action function OR action object of HTTP methods mapped to action functions
   * @throws
   *  ArgumentError: invalid path (empty string)
   *  TypeError: invalid ctrl/action type (function required)
   *  NotSupportedError: invalid HTTP methods
   *  AlreadyInUseError: route is already registered
   */
  addRoute: function addRoute(controller, method, path, action) {
    var controllerFile = controller.file;
    path = path.trim();
    method = method.trim().toLowerCase();

    if (!path) {
      throw new errors.ArgumentError('Invalid route path: empty string');
    }

    if (typeof action !== 'function') {
      throw new errors.TypeError('Controller action must be a function. Given: "' + typeof action + '" for route "' + method + ' ' + path + '" in "' + controllerFile + '"');
    }

    if (-1 == _.indexOf(['get', 'post', 'put', 'delete', 'all', 'head', 'options'], method)) {
      throw new errors.NotSupportedError('Invalid HTTP method: ' + method);
    }

    if (!this.routes[method]) {
      this.routes[method] = {};
    }

    if (typeof this.routes[method][path] !== 'undefined') {
      throw new errors.AlreadyInUseError('Route "' + method + ' ' + path + '" is already registered in "' + this.routes[method][path].file + '"');
    }

    var self = this;
    this.routes[method][path] = {

      file: controllerFile,
      action: function(req, res) {
        //var _send = res.send;
        //res.send = function(body) {
        //  ctrl.after(function() {
        //    return _send.call(res, body);
        //  });
        //};
        controller.before(req, res, function(data) {
          action.call(controller, req, res);
        });
      }

    };

  },

  timerMiddleware: function(req, res, next) {
    req._startTime = process.hrtime();
    res.getTime = function() {
      var hrtime = process.hrtime(req._startTime);
      return parseFloat((parseFloat(hrtime[0]) + (hrtime[1] * 1e-9)).toFixed(3));
    }

    if (!this.config.logRequests.enabled) {
      return next();
    }

    var self = this;
    function logRequest() {
      self.log(req.method + ' (' + res.getTime() + 's' + ') ' + req.path);
    }

    require('on-finished')(res, logRequest);
    next();
  }
});


exports.Controller = require('./Controller');
exports.Error = require('./Error');

function registerDomain(req, res, next) {
  var requestDomain = domain.create();

  requestDomain.add(req);
  requestDomain.add(res);

  // this is necessary for access via process.domain
  requestDomain.req = req;
  requestDomain.res = res;

  // handle uncaught exceptions
  requestDomain.on('error', function (err) {
    sand.log(err.message, err.stack);

    // try to send a 500 response to the client
    try {
      // stop aura
      sand.shutdown(function() {
        var killTimer = setTimeout(function () {
          process.exit(1);
        }, 1000);

        killTimer.unref();
      });

      // send 500 response
      res.status(500);
      res.setHeader('content-type', 'text/plain');
      res.end('Internal Server Error');

    } catch (err2) {
      sand.log('Error sending 500 response', err2.stack);
    }
  });

  requestDomain.run(next);
}