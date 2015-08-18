"use strict";

const Controller = require('../..').Controller;
const pasync = require('pasync');
const co = require('co');

console.log('generating payload...');
let PAYLOAD = '.'.repeat(parseInt(Math.random() * 10000) + 100000);
console.log('generated payload!');

const stats = {};

function saveTime() {
  if (!stats[this.actionName]) {
    stats[this.actionName] = {count: 0, sum: 0};
  }
  let time = process.hrtime(this._time);
  time = (time[0] * 1e9 + time[1]) / 1e9;
  stats[this.actionName].count++;
  stats[this.actionName].sum += time;
}

let logTimeout;

class Bench extends Controller {

  static *before() {
    this._time = process.hrtime();

    this.respond = function() {
      saveTime.call(this);
      clearTimeout(logTimeout);
      this.type('text/plain').status(200).send(PAYLOAD);

      logTimeout = setTimeout(function() {
        let stat = stats[this.actionName];
        console.log(this.actionName, stat, stat.sum / stat.count);
        stats[this.actionName] = undefined;
      }.bind(this), 1000);
    };

    this.num = function() {
      return this.queryInt('num') || 500;
    };

    this.newArray = function(num) {
      let arr = new Array(num || this.num());
      for (let i = 0; i < arr.length; i++) {
        arr[i] = i;
      }
      //arr[0] = '';
      //arr[arr.length - 1] = '';
      return arr;
    };

  }

  static *simplePayload() {
    this.respond();
  }

  static *serialLoop() {
    // initialize dummy array
    let arr = this.newArray();

    // iterate serially
    for (let i = 0; i < arr.length; i++) {
      yield takeSomeTime();
    }

    this.respond();
  }

  static *serialInLoop() {
    // initialize dummy array
    let arr = this.newArray();

    // iterate serially
    for (let i in arr) {
      yield takeSomeTime();
    }

    this.respond();
  }

  static *serialOfLoop() {
    // initialize dummy array
    let arr = this.newArray();

    // iterate serially
    for (let i of arr) {
      yield takeSomeTime();
    }

    this.respond();
  }

  static *parallelLoop() {
    // initialize dummy array
    let arr = this.newArray();

    // iterate parallel limited
    yield pasync.mapLimit(arr, 10, function() {
      return takeSomeTime();
    });

    this.respond();
  }

  static *mapLoop() {
    // initialize dummy array
    let arr = this.newArray();

    let iter = co.wrap(function *() {
      return yield takeSomeTime();
    });

    // iterate parallel limited
    arr.map(iter);

    this.respond();
  }

}

module.exports = Bench;

function takeSomeTime(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time || 1);
  });
}