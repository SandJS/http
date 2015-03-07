var sand = require('sand');
var HTTP = require('../../../lib/Http');
var Controller = require('../../../lib/Controller');

global.Controller = Controller;


var app = sand({
  appPath: __dirname
});

app
  .use(HTTP)
  .start();