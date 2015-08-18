"use strict";

const sand = require('sand');
const http = require('..');

new sand({log: '*'}).use(http, {all: {port: 3000}}).start();

