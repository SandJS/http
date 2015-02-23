/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

//process.env.NODE_DEBUG = 'request';

var request = require('request');
var sand = require('sand');
var fs = require('fs');
var spdy = require('spdy');

var port = 59142;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//var spdyAgent = spdy.createAgent({
//  host: '127.0.0.1',
//  port: port,
//
//  // Optional SPDY options
//  spdy: {
//    plain: true,
//    ssl: true,
//    version: 3 // Force SPDY version
//  }
//});
//
//var app = sand({log: '*'})
//  .use(require('../..'), {all: {
//    port: port,
//    spdy: {
//      key: fs.readFileSync(__dirname + '/../../../keys/key.pem'),
//      cert: fs.readFileSync(__dirname + '/../../../keys/cert.pem'),
//      ca: fs.readFileSync(__dirname + '/../../../keys/ca.pem')
//    }
//  }});
//
//app.start(function() {
//  setTimeout(function() {
//    request({
//      url: 'https://localhost:' + port + '/',
//      agentOptions: {
//        host: '127.0.0.1',
//        port: port,
//
//        // Optional SPDY options
//        spdy: {
//          plain: true,
//          ssl: true,
//          version: 3 // Force SPDY version
//        }
//      },
//      agentClass: spdy.createAgent
//    }, function(err, resp, body) {
//      console.log(err, body);
//    });
//
//    //require('http').get({
//    //  host: 'localhost',
//    //  agent: spdyAgent
//    //}, function(response) {
//    //  console.log('yikes');
//    //  // Here it goes like with any other node.js HTTP request
//    //  // ...
//    //  // And once we're done - we may close TCP connection to server
//    //  // NOTE: All non-closed requests will die!
//    //  spdyAgent.close();
//    //}).on('error', function(err) {
//    //  console.log('client', err);
//    //}).end();
//  }, 1000);
//});

  request({
    url: 'https://127.0.0.1:9001/',
    agentOptions: {
      host: '127.0.0.1',
      port: 9001,

      // Optional SPDY options
      spdy: {
        plain: true,
        ssl: true,
        version: 3 // Force SPDY version
      }
    },
    agentClass: spdy.createAgent
  }, function (err, resp, body) {
    console.log(err, body);
  });