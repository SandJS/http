/**
 * Author:    Adam Jaso <ajaso@pocketly.com>
 * Copyright: 2014 Pocketly
 */

var Http = require('..');
var sand = require('sand');
var request = require('request');
var async = require('async');
var _ = require('lodash');
var errors = require('common-errors');

describe('Routes', function() {

  describe('addRoute()', function() {

    /*
     invalid path
     invalid action
     invalid http method
     route is already registered
     */

    var testBadRoutes = [
      {
        file: __dirname + '/goodControllers/user',
        method: 'get',
        path: '',
        action: function() {},
        description: 'invalid path',
        error: errors.NotFoundError
      },
      {
        file: __dirname + '/goodControllers/good',
        method: 'get',
        path: '/',
        action: null,
        description: 'invalid action',
        error: errors.TypeError
      },
      {
        file: __dirname + '/goodControllers/user',
        method: 'foo',
        path: '/foo',
        action: function() {},
        description: 'invalid http method',
        error: errors.NotSupportedError
      }
    ];

    _.each(testBadRoutes, function(test) {
      it('should fail because of ' + test.description, function() {
        var TestController = require(test.file);
        var testCtrl = new TestController(test.file);
        var routes = new Http.Routes();
        try {
          routes.addRoute(testCtrl, test.method + ' ' + test.path, test.method, test.path, test.action);
          true.should.not.be.ok;
        } catch (e) {
          e.should.be.instanceOf(test.error);
        }
        //instance.routes.hasOwnProperty('get').should.not.be.ok;
      });
    });

    it('should fail because already registered', function() {
      var test = {
        file: __dirname + '/goodControllers/user',
        method: 'get',
        path: '/foo',
        action: function() {},
        description: 'route already registered',
        error: errors.AlreadyInUseError
      };

      var TestController = require(test.file);
      var testCtrl = new TestController(test.file);
      var routes = new Http.Routes();

      try {
        routes.addRoute(testCtrl, test.method + ' ' + test.path, test.method, test.path, test.action);
        routes.addRoute(testCtrl, test.method + ' ' + test.path, test.method, test.path, test.action);
        true.should.not.be.ok;

      } catch (e) {
        e.should.be.instanceOf(test.error);
      }
    });

    it('should register successfully', function() {
      var test = {
        method: 'get',
        file: __dirname + '/goodControllers/good',
        path: '/',
        action: function() {}
      };

      var TestController = require(test.file);
      var testCtrl = new TestController(test.file);
      var routes = new Http.Routes();
      routes.addRoute(testCtrl, test.method + ' ' + test.path, test.method, test.path, test.action);

      (routes.routes[test.method][test.path]).should.be.type('object');
      (routes.routes[test.method][test.path].file).should.equal(test.file);
    });

  });

  describe('parseRoute()', function() {

    var testGoodRoutes = [
      {
        route: '/',
        method: 'get',
        path: '/',
      },
      {
        route: 'get /test',
        method: 'get',
        path: '/test',
      },
      {
        route: 'DELETE /test',
        method: 'delete',
        path: '/test'
      },
      {
        route: '/store',
        path: '/store',
        action: {
          get: function () {},
          put: function () {},
          post: function () {},
          delete: function () {},
        }
      },
      {
        route: '/asdf',
        path: '/asdf',
        methods: [
          'get',
          'put',
          'post',
          'delete'
        ],
        action: {
          GET: function () {},
          PUT: function () {},
          POST: function () {},
          DELETE: function () {},
        }
      }
    ];

    _.each(testGoodRoutes, function (test) {
      it('should parse routes like "' + test.route + '"' + (test.action ? ' with multi methods "' + Object.keys(test.action).join('", "') + '"' : ''), function () {

        test.file = __dirname + '/goodControllers/' + test.file + '.js';

        // create a test controller
        var testCtrlProto = {};
        testCtrlProto[test.route] = test.action || _.noop;
        var TestController = Http.Controller.extend(testCtrlProto);
        var testCtrl = new TestController('TestController');
        var routes = new Http.Routes();

        routes.parseRoute(testCtrl, test.route);

        if (_.isObject(test.action)) {
          _.each(test.methods, function (method) {
            validateRoute.call(routes.routes, method, test.path);
          });
        } else {
          validateRoute.call(routes.routes, test.method, test.path);
        }

      });
    });

    function validateRoute(method, path) {
      this.hasOwnProperty(method).should.be.ok;
      this[method].should.be.type('object');
      this[method][path].should.be.type('object');
      this[method][path].action.should.be.type('function');
    }


    var testBadRoutes = [
      {
        route: 'DELETE /test',
        action: {
          get: function() {},
          post: function() {}
        }, // can't have this if we've already specified a method
        error: errors.TypeError
      },
      {
        route: '/test',
        action: {}, // no methods specified
        error: errors.NotFoundError
      },
      {
        route: '',  // no method or path (route) specified
        action: {},
        error: errors.ArgumentError
      },
      {
        route: 'get ', // no path specified
        action: {},
        error: errors.NotFoundError
      }
    ];

    _.each(testBadRoutes, function (test) {
      it('should not parse routes like "' + test.route + '"' + (test.action ? ' with multi methods "' + Object.keys(test.action).join('", "') + '"' : ''), function() {

        // create a test controller
        var testCtrlProto = {};
        testCtrlProto[test.route] = test.action || _.noop;
        var TestController = Http.Controller.extend(testCtrlProto);
        var testCtrl = new TestController('TestController');
        var routes = new Http.Routes();

        try {
          routes.parseRoute(testCtrl, test.route);
          true.should.not.be.ok;

        } catch (e) {
          e.should.be.instanceOf(test.error);
        }
      });
    });

  });
});


describe('Controller', function() {

  var goodControllerRoutes = {
    get: [
      '/',
      '/user',
      '/xyz'
    ],
    put: [
      '/save',
      '/user'
    ],
    post: [
      '/save',
      '/user',
      '/xyz'
    ]
  };

  it('should map a valid controller successfully', function() {

    var controllerFile = __dirname + '/goodControllers/good';
    var controller = require(controllerFile);
    controller = new controller();
    var routes = new Http.Routes();

    try {
      controller.normalizeRoutes(routes);
      _.each(goodControllerRoutes, function(paths, method) {
        _.each(paths, function(path) {
          routes.routes[method][path].should.be.a.function;
        });
      });

      true.should.be.ok;

    } catch (e) {
      console.log(e);
      true.should.not.be.ok;
    }
  });

});


describe('Policies', function() {
  
  var app;
  before(function(done) {

    app = sand({appPath: __dirname + '/..'});
    app.use(Http, {
      all: {
        controllerPath: '/test/goodControllers',
        policyFile: '/test/policies/policies',
        port: 58921
      }
    }).start(done);

  });

  after(function(done) {
    app.shutdown(done);
  });

  it('should call the proper policies for each controller/action', function(done) {

    done = _.once(done);

    // valid policies include...
    var tests = _.map({
      '/': 'public', // a method on the controller
      '/user': 'before', // default to the `before`
      '/xyz': 'customFunction' // a custom function

    }, function(policyName, path) {

      return function(done2) {
        request('http://localhost:58921' + path, function (err, resp, body) {
          body = JSON.parse(body);
          body.error.should.be.false;
          body.policyName.should.eql(policyName);
          done2();
        });
      };

    });

    async.parallel(
      tests,

      function(err) {
        if (err) {
          console.log(err);
        }
        done();
      });

  });

  it('should skip all remaining policies if req.skipToAction is called', function(done) {

    request('http://localhost:58921/skip/dummy', function (err, resp, body) {
      body = JSON.parse(body);
      body.error.should.be.false;
      body.policyName.should.eql('skip');
      done();
    });
  });

  it('should call the all policies for arrays', function(done) {
    request('http://localhost:58921/dual', function (err, resp, body) {
      console.log(body);
      body = JSON.parse(body);
      body.error.should.be.false;
      body.policy1Name.should.eql('policy1');
      body.policy2Name.should.eql('policy2');
      done();
    });
  })

});


describe('Http', function() {

  describe('init()', function() {
    var tests = [
      {
        controllerPath: '/test/goodControllers',
        valid: true
      },
      {
        controllerPath: '/test/badControllers',
        valid: false
      }
    ];

    _.each(tests, function(test) {
      it('should ' + (test.valid ? '' : 'not ') + 'initialize successfully with a directory of ' + (test.valid ? 'valid' : 'invalid') + ' controllers', function(done) {

        var _done = _.once(done);

        var app = sand({appPath: __dirname + '/..'});
        try {
          app.use(Http, {"all": {controllerPath: test.controllerPath}}).start(function () {

            test.valid.should.be.ok;

            try {
              app.shutdown(function () {

              });
              _done();
            } catch (e) { }
          });

        } catch (e) {
          //console.log(e);
          test.valid.should.not.be.ok;
          _done();
        }
      });
    });

    it ('should have domains separate per request', function(done) {

      var app = sand({appPath: __dirname + '/..'}).use(Http, {"all": {controllerPath: '/test/goodControllers', port: 58921}})
        .start(function() {
          request('http://localhost:58921/domain', function (err, resp, body) {
            body.should.be.eql('1');
            app.shutdown();
            done();
          });

        });

    });

  });
});

describe('Requests', function() {
  function testErrorResponses(sandConfig, httpConfig, fromView) {
    fromView = fromView || false;
    var app;
    before(function(done) {
      app = sand(sandConfig)
        .use(Http, httpConfig)
        .start(done);
    });

    after(function(done) {
      app.shutdown(done);
    });

    function expect(code, message, done) {
      request('http://localhost:' + httpConfig.all.port + '/' + code, function(err, res, body) {
        try {
          res.statusCode.should.be.eql(code);
          body.should.eql(message + (fromView ? ' From View' : ''));
        } catch (e) {
          console.log(e);
          throw e;
        }
        done();
      })
    }

    it('should respond 500', function(done) {
      expect(500, 'Internal Server Error', done);
    });

    it('should respond 404', function(done) {
      expect(404, 'Not Found', done);
    });

    it('should respond 401', function(done) {
      expect(401, 'Not Authorized', done);
    });

    it('should respond 403', function(done) {
      expect(403, 'Forbidden', done);
    });

    it('should respond 400', function(done) {
      expect(400, 'Bad Request', done);
    });
  }

  describe('Default Responses Without Views', function() {
    testErrorResponses({log:'*',appPath: __dirname + '/..'}, {
      all: {
        port: 58921,
        controllerPath: '/test/goodControllers'
      }
    });
  });

  describe('Default Responses With Views', function() {
    testErrorResponses({
      appPath: __dirname + '/..',
      all: {
        log: '*'
      }
    }, {
      all: {
        port: 58921,
        controllerPath: '/test/goodControllers',
        view: {
          enabled: true,
          path: '/test/views'
        },
        500: 'errors/500',
        400: 'errors/400',
        401: 'errors/401',
        403: 'errors/403',
        404: 'errors/404'
      }
    }, true);
  });
});