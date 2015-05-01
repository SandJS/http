var sand = require('sand');
var HTTP = require('../../../lib/Http');
var Controller = require('../../../lib/Controller');

global.Controller = Controller;


var app = new sand({
  appPath: __dirname,
  log: '*'
});

app
  .use(HTTP)
  .start();