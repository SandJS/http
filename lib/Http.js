/**
 * Module Dependencies
 */
var SandGrain = require('sand-grain');
var express = require('express');
var _ = require('lodash');
var errors = require('common-errors');
var fs = require('fs');
var domain = require('domain');
var View = require('./View');
var Controller = require('./Controller');
var Routes = require('./Routes');
var sanitize = require('sanitize');

/**
 * Expose `HTTP`
 */
exports = module.exports = SandGrain.extend({
  name: 'http',

  construct: function() {
    this.super();

    this.defaultConfig = require('./defaultConfig');
    this.version = require('../package').version;

    this.express = null;
    this.server = null;
    this.routes = {};
    this.controllers = {};
    this.policies = null;

    this.time = {
      numRequests: 0,
      total: 0,
      avg: 0,
      min: 0,
      max: 0
    };

    this.socketId = 0;
    this.sockets = {};

    this.logRoute = this.log.as('http:route');
  },

  init: function(config, done) {
    this.super(config);

    this.controllerPath = sand.appPath + this.config.controllerPath;
    this.policyFile = sand.appPath + this.config.policyFile;

    this.express = express();

    // setup process.domain
    this.express.use(registerDomain.bind(this));

    // setup input sanitizer
    this.express.use(sanitize.middleware);
    this.express.use(this.timerMiddleware.bind(this));
    this.express.use(require('./hooks/request')(this.config));
    this.emit('router:before', this.express);
    this.express.use(express.static('public'));

    if (this.config.view.enabled) {
      View(this.config).registerWithExpress(this.express);
    }

    this.loadControllers();
    this.emit('router:after', this.express);
    this.server = this.express.listen(this.config.port, function() {
      this.log('Listening on ' + this.config.port);
      done();
    }.bind(this));

    this.server.on('connection', this.onConnection.bind(this));

    return this;
  },

  shutdown: function(done) {
    var cluster = require('cluster');
    this.log("Shutting down server");
    var _done = done;
    var isDone = false;
    done = function() {
      if (!isDone) {
        isDone = true;
        _done();
      }
    };
    try {
      this.server.close(done);

      // lets give it a few seconds, avg response time
      setTimeout(function() {
        // Close all sockets
        for (var socketId in this.sockets) {
          if (this.sockets.hasOwnProperty(socketId)) {
            this.sockets[socketId].destroy();
          }
        }
        done();
      }, Math.ceil(this.time.avg + 1)).unref();
    } catch(e) {
      // Must of already been shutdown, do nothing
      done();
    }
  },

  loadPolicies: function loadPolicies() {
    if (!fs.existsSync(!/\.js$/.test(this.policyFile) ? this.policyFile + '.js' : this.policyFile)) {
      this.log('WARN: Missing policy file. Skipping loading of policies...');
      return;
    }

    var policyMap = require(this.policyFile);

    _.each(policyMap, function(policy, pattern) {
      this.express.use(pattern, function(req, res, next) {
        if (!req.skipToAction) {
          req._skipToAction = false;
          req.skipToAction = function() {
            req._skipToAction = true;
            next();
          };
        }

        if (req._skipToAction) {
          return next();
        }

        policy.apply(this, arguments);
      }.bind(policy));
    }.bind(this));
  },

  /**
   * load all controller files
   * recursively looks in the
   * config.controllerPath folder
   */
  loadControllers: function loadControllers() {

    this.loadPolicies();

    if (!fs.existsSync(this.controllerPath)) {
      this.log("WARN: Missing controllers directory. Skipping loading of controllers...");
      return;
    }

    var files = require('require-all')({
      dirname: this.controllerPath,
      filter: /(\w+)\.js/
    });

    var routes = new exports.Routes();

    this.normalizeRoutes(routes, files);

    this.routes = routes.routes;

    for (var method in this.routes) {
      if (this.routes.hasOwnProperty(method)) {

        for (var path in this.routes[method]) {
          if (this.routes[method].hasOwnProperty(path)) {

            var details = this.routes[method][path];
            this.logRoute('Mapping: ' + method.toUpperCase() + ' ' + path);
            this.express[method](path, details.action);
          }
        }
      }
    }

  },

  normalizeRoutes: function(routes, files) {
    for (var controllerName in files) {
      if (files.hasOwnProperty(controllerName)) {
        var file = require('path').resolve(this.controllerPath + '/' + controllerName + '.js');

        this.controllers[file] = files[controllerName];

        var controller = files[controllerName];

        if (_.isPlainObject(controller)) {
          this.normalizeRoutes(routes, controller);
        } else {
          var ctrl = new controller(file);
          ctrl.normalizeRoutes(routes);
        }
      }
    }
  },


  timerMiddleware: function(req, res, next) {
    req._startTime = process.hrtime();
    res.getTime = function() {
      var hrtime = process.hrtime(req._startTime);
      return parseFloat((parseFloat(hrtime[0]) + (hrtime[1] * 1e-9)).toFixed(3));
    };

    if (!this.config.logRequests.enabled) {
      return next();
    }

    var self = this;
    function logRequest() {
      var time = res.getTime();
      self.time.numRequests++;
      self.time.total += time;
      self.time.avg = parseFloat((self.time.total / self.time.numRequests).toFixed(3));

      if (self.time.min === 0 || time < self.time.min) {
        self.time.min = time;
      }

      if (time > self.time.max) {
        self.time.max = time;
      }

      self.logRoute(req.method + ' (' + time + 's' + ') ' + req.path);
    }

    require('on-finished')(res, logRequest);
    next();
  },

  onConnection: function(socket) {
    var self = this;
    var socketId = ++self.socketId;
    this.sockets[socketId] = socket;

    this.sockets[socketId].once('close', function() {
      delete self.sockets[socketId];
    });
  }
});


exports.Controller = require('./Controller');
exports.Error = require('./Error');
exports.Routes = require('./Routes');


function registerDomain(req, res, next) {
  var self = this;
  var requestDomain = domain.create();

  requestDomain.add(req);
  requestDomain.add(res);

  // this is necessary for access via process.domain
  requestDomain.req = req;
  requestDomain.res = res;

  // handle uncaught exceptions
  requestDomain.on('error', function (err) {
    self.log(err.stack || err);

    // try to send a 500 response to the client
    try {
      // send 500 response
      if (!res.headersSent) {
        res.serverError();
      }
    } catch (err2) {
      self.log('Error sending 500 response', err2.stack || err2);
    }
  });

  requestDomain.run(next);
}
