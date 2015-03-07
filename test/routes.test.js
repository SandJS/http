"use strict";

var sand = require('sand');
var HTTP = require('..');
var Controller = require('../lib/Controller');
var request = require('request');

global.Controller = Controller;

var sandConfig = {
  appPath: __dirname + '/examples/http'
};

describe('Routes', function() {
  var http = new HTTP();

  var app = sand(sandConfig).use(http);

  before(function(done) {
    // Need to make sure sand is correct
    global.sand = app;
    app.start(done);
  });

  describe('process routes correctly', function() {


    var routes = {
      '/': '^/$ => Index.index',
      '/index': '^/(\\w+)$ => Index.$1',
      '/test/named': '^/test/(?<named>\\w+)$ => Test.${named}',
      '/user/123': '/user/(?<id>\\d+) => User.index',
      '/multi': '^/multi$ => { get: Index.multiGet }',
      '/Index/view': 'No Route, Default Controller/Action'
    };

    for (let route in routes) {
      if (!routes.hasOwnProperty(route)) {
        continue;
      }

      let regex = routes[route];
      it(`should route ${regex}`, function (done) {
        request(`http://localhost:3000${route}`, function(err, response, body) {
          response.statusCode.should.be.eql(200);
          done();
        });
      });
    }
  });

  it('should deny in before', function(done) {
    request('http://localhost:3000/denyRoute', function(err, response) {
      response.statusCode.should.be.eql(401);
      done();
    })
  });

  after(function(done) {
    app.shutdown(done);
  })
});