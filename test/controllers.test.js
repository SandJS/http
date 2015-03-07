"use strict";

var sand = require('sand');
var HTTP = require('..');
var Controller = require('../lib/Controller');
var request = require('request');

global.Controller = Controller;

var sandConfig = {
  appPath: __dirname + '/examples/http'
};

describe('Controllers', function() {
  var http = new HTTP();

  var app = sand(sandConfig).use(http);

  before(function(done) {
    // Need to make sure sand is correct
    global.sand = app;
    app.start(done);
  });

  let contentTypes = ['application/json', 'text/html', 'text/plain'];

  for (let type of contentTypes) {
    it(`it should throw 500 and get ${type}`, function (done) {
      request('http://localhost:3000/Test/throw500', {
        headers: {
          'accept': type
        }
      }, function (err, response, body) {
        response.headers['content-type'].should.containEql(type);
        response.statusCode.should.be.eql(500);
        done();
      })
    });
  }

  let errorCodes = [400, 401, 403, 404, 500, 503];

  for (let code of errorCodes) {
    it(`it should throw ${code}`, function (done) {
      request(`http://localhost:3000/Error/throw${code}`, function (err, response) {
        response.statusCode.should.be.eql(code);
        done();
      })
    });
  }

  it ('should run parent and child before', function(done) {
    request('http://localhost:3000/Test/verifyBefore', function (err, response, body) {
      body.should.be.equal('yes');
      done();
    })
  });

  it ('each request should have its own domain', function(done) {
    request('http://localhost:3000/Test/domain', function (err, response, body) {
      body.should.be.equal('yes');
      done();
    })
  });

  after(function(done) {
    app.shutdown(done);
  })
});