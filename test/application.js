/**
 * Author:    Adam Jaso <ajaso@pocketly.com>
 * Copyright: 2014 Pocketly
 */

var Http = require('..');
var sand = require('sand');
var request = require('request');
var _ = require('lodash');
var errors = require('common-errors');

describe('http.addRoute()', function() {

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
      error: errors.ArgumentError
    },
    {
      file: __dirname + '/goodControllers/store',
      method: 'get',
      path: '/',
      action: null,
      description: 'invalid action',
      error: errors.TypeError
    },
    {
      file: __dirname + '/goodControllers/foo',
      method: 'foo',
      path: '/foo',
      action: function() {},
      description: 'invalid http method',
      error: errors.NotSupportedError
    }
  ];

  _.each(testBadRoutes, function(test) {
    it('should fail because of ' + test.description, function() {
      var instance = new Http;
      try {
        instance.addRoute(test.file, test.method, test.path, test.action);
        true.should.not.be.ok;
      } catch (e) {
        e.should.be.instanceOf(test.error);
      }
      //instance.routes.hasOwnProperty('get').should.not.be.ok;
    });
  });

  it('should fail because already registered', function() {
    var test = {
      file: __dirname + '/goodControllers/foo',
      method: 'get',
      path: '/foo',
      action: function() {},
      description: 'route already registered',
      error: errors.AlreadyInUseError
    };
    var instance = new Http;

    try {
      instance.addRoute(test, test.method, test.path, test.action);
      instance.addRoute(test, test.method, test.path, test.action);
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
    //var file = __dirname + '/goodControllers/good';
    //var method = 'get';
    //var path = '/';
    //var action = function() {};
    var instance = new Http;
    instance.addRoute(test, test.method, test.path, test.action);

    (instance.routes[test.method][test.path]).should.be.type('object');
    (instance.routes[test.method][test.path].file).should.equal(test.file);
  });

});


describe('http.parseRoute()', function() {

  var testGoodRoutes = [
    {
      route: '/',
      file: 'user',
      method: 'get',
      path: '/',
    },
    {
      route: 'get /test',
      file: 'test',
      method: 'get',
      path: '/test',
    },
    {
      route: 'DELETE /test',
      file: 'test',
      method: 'delete',
      path: '/test'
    },
    {
      route: '/store',
      file: 'store',
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
      file: 'asdf',
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

      var instance = new Http;
      instance.parseRoute(test, test.route, test.action || function () {});

      if (_.isObject(test.action)) {
        _.each(test.methods, function (method) {
          validateRoute.call(instance, method, test.path, test.file);
        });
      } else {
        validateRoute.call(instance, test.method, test.path, test.file);
      }

    });
  });

  function validateRoute(method, path, file) {
    this.routes.hasOwnProperty(method).should.be.ok;
    this.routes[method].should.be.type('object');
    this.routes[method][path].should.be.type('object');
    this.routes[method][path].file.should.equal(file);
    this.routes[method][path].action.should.be.type('function');
  }


  var testBadRoutes = [
    {
      route: 'DELETE /test',
      action: {
        get: function() {},
        post: function() {}
      }, // can't have this if we've already specified a method
      error: errors.TypeError,
      file: 'test',
      method: 'delete',
      path: '/test',
    },
    {
      route: '/test',
      action: {}, // no methods specified
      error: errors.NotFoundError,
      file: 'test',
      method: 'delete',
      path: '/test',
    },
    {
      route: '',  // no method or path (route) specified
      action: {},
      error: errors.ArgumentError,
      file: 'test',
      method: 'delete',
      path: '/test',
    },
    {
      route: 'get ', // no path specified
      action: {},
      error: errors.NotFoundError,
      file: 'test',
      method: 'delete',
      path: '/test',
    },
  ];

  _.each(testBadRoutes, function (test) {
    it('should not parse routes like "' + test.route + '"' + (test.action ? ' with multi methods "' + Object.keys(test.action).join('", "') + '"' : ''), function() {
      var file = __dirname + '/goodControllers/' + test.file;

      var instance = new Http;

      try {
        instance.parseRoute(file, test.route, test.action || function () {});
        true.should.not.be.ok;

      } catch (e) {
        e.should.be.instanceOf(test.error);
      }
    });
  });

});

describe('http.mapController()', function() {
  it('should map a valid controller successfully', function() {

    var controllerFile = __dirname + '/goodControllers/good';
    var controller = require(controllerFile);
    var instance = new Http;

    try {
      instance.mapController(controller);
      true.should.be.ok;

    } catch (e) {
      console.log(e);
      true.should.not.be.ok;
    }
  });
});

describe('http.init()', function() {
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

      var _isDone = false;

      function _done() {
        if (!_isDone) {
          _isDone = true;
          done();
        }
      }


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
        test.valid.should.not.be.ok;
        _done();
      }
    });
  });

  it ('should have domains separate per request', function(done) {

    var app = sand({appPath: __dirname + '/../'}).use(Http, {"all": {controllerPath: '/test/goodControllers', port: 8005}})
      .start(function() {
        request('http://localhost:8005/domain', function (err, resp, body) {
          body.should.be.eql('1');
          done();
          app.shutdown();
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
    testErrorResponses({log:'*',appPath: __dirname + '/../'}, {
      all: {
        port: 58921,
        controllerPath: '/test/goodControllers'
      }
    });
  });

  describe('Default Responses With Views', function() {
    testErrorResponses({
      appPath: __dirname + '/../',
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