/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

var request = require('request');
var sand = require('sand');
var fs = require('fs');
var spdy = require('spdy');

var port = 59142;

var spdyAgent = spdy.createAgent({
  host: '127.0.0.1',
  port: port,

  // Optional SPDY options
  spdy: {
    plain: true,
    ssl: false,
    version: 3 // Force SPDY version
  }
});

var app = sand({log: '*'})
  .use(require('../..'), {all: {
    port: port,
    spdy: {
      key: fs.readFileSync(__dirname + '/keys/key.pem'),
      cert: fs.readFileSync(__dirname + '/keys/cert.pem'),
      ca: fs.readFileSync(__dirname + '/keys/ca.pem')
    }
  }});

app.start(function() {
  setTimeout(function() {
    request.get({
      url: 'https://localhost:' + port + '/',
      strictSSL: false,
      pool: spdyAgent
    }, function(err, resp, body) {
      console.log(err, body);
    });
  }, 1000);
});