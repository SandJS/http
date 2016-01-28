"use strict";

var createError = require('http-errors');
var httpAssert = require('http-assert');
var statuses = require('statuses');
var delegate = require('delegates');
var _ = require('lodash');
var sanitize = require('sanitize');
var View = require('./View');

const SkipError = require('./SkipError');
const ExitError = require('./ExitError');
const EventEmitter = require('events').EventEmitter;

/**
 * Context is your main class.
 * In an `action` and `before` context
 * will be your `this`.  Anything your attach
 * to context will be passed along. Plus context
 * adds a lot of nice conveniences.
 */
class Context extends EventEmitter {
  constructor(req, res) {
    super();

    this.req = this.request = req;
    this.res = this.response = res;
    this.controllerName = null;
    this.actionName = null;

    this.res.serverError = this.serverError.bind(this);

    // Apply Sanitizer
    sanitize.middleware(this, this.res, _.noop);

    View.applyMixin(this);

    // lets bind context to sand grains
    if (sand && sand.modules && sand.modules.length > 0) {
      sand.modules.forEach(function(m) {
        if (typeof sand[m.name] !== 'undefined') {
          if (typeof sand[m.name].bindToContext === 'function') {
            sand[m.name].bindToContext(this);
          }

          if (typeof sand[m.name].onContextEnd === 'function') {
            this.on('end', function() {
              sand[m.name].onContextEnd(this);
            }.bind(this))
          }
        }
      }.bind(this))
    }

    // lets add context to res
    this.res.context = this;

    require('on-finished')(res, function() {
      sand.http.emit('request:finished', this);
      this.emit('end');
    }.bind(this));
  }

  /**
   * Throw
   *
   * Throw an error with `msg` and optional `status`
   * defaulting to 500. Note that these are user-level
   * errors, and the message may be exposed to the client.
   *
   * ```
   *    this.throw(403)
   *    this.throw('name required', 400)
   *    this.throw(400, 'name required')
   *    this.throw('something exploded')
   *    this.throw(new Error('invalid'), 400);
   *    this.throw(400, new Error('invalid'));
   * ```
   *
   * See: https://github.com/jshttp/http-errors
   *
   * @param {String|Number|Error} status, msg or error
   * @param {String|Number|Error} msg, error, or status]
   * @param {Object} [props]
   * @api public
   */
  throw(status, msg, props){
    throw createError.apply(null, arguments);
  }

  /**
   * Similar to .throw(), adds assertion.
   *
   *    this.assert(this.user, 401, 'Please login!');
   *
   * See: https://github.com/jshttp/http-assert
   *
   * @param {*} test
   * @param {Number} status
   * @param {String} message
   * @api public
   */
  assert(test, status, message) {
    httpAssert.apply(null, test, status, message);
  }

  /**
   * Default error handling
   *
   * @param {Error} err
   *
   * @api private
   */
  onError(err) {
    // Don't do anything if there is no error
    // this allows you to pass `this.onError`
    // to node-style callbacks
    if (null === err) {
      return;
    }

    if (!err.stack) {
      err = new Error('' + err);
    }

    if (err.status) {
      if (!err.statusCode) {
        err.statusCode = err.status;
      }
      delete err.status;
    }

    if (!(err instanceof HttpError)) {
      err = new HttpError((err.statusCode || 500), err);
    }

    if (_.isFunction(sand.http.config.onError)) {
      sand.http.config.onError(err, this);
    }

    // Nothing we can do here other than
    // delegate to the app-level
    // handler and log
    if (this.res.headersSent || !this.res.writable) {
      err.headersSent = true;
      sand.emit('error', err);
      return;
    }

    // Handle not found
    if ("ENOENT" === err.code) {
      err.statusCode = 404;
    }

    // correct status codes
    if ('number' !== typeof err.statusCode || !statuses[err.statusCode]) {
      err.statusCode = 500;
    }

    let code = statuses[err.statusCode];
    let message = err.expose ? err.message : code;

    this.res.status(err.statusCode);

    let contentType = this.res.get('Content-Type');
    if ('string' === typeof contentType) {
      let split = contentType.split(';');
      this.req.headers.accept = split[0];
    }

    if (500 === err.statusCode) {
      sand.error('\n' + message, err.stack);
    }

   sand.http.config.sendErrorResponse.call(this, err);
  }

  /**
   * Throws a 404 Error
   *
   * @param {string} [message='Not Found'] - The 404 Message
   * @param {object} [data] - Any extra data to pass along
   *
   * @throws {HttpError}
   */
  notFound(message, data) {
    this.throw(404, message, data);
  }

  /**
   * Throws a 500 error
   *
   * @param {string} [message='Internal Server Error'] - The 500 Message
   * @param {object} [data] - Any extra data to pass along
   *
   * @throws {HttpError}
   */
  serverError(message, data) {
    this.throw(500, message, data);
  }

  /**
   * Throws a 400 bad request error
   *
   * @param {string} [message='Bad Request'] - The 400 Message
   * @param {object} [data] - Any extra data to pass along
   *
   * @throws {HttpError}
   */
  badRequest(message, data) {
    this.throw(400, message, data);
  }


  /**
   * Throws a 503 bad request error
   *
   * @param {string} [message='Bad Request'] - The 400 Message
   * @param {object} [data] - Any extra data to pass along
   *
   * @throws {HttpError}
   */
  serviceUnavailable(message, data) {
    this.throw(503, message, data);
  }

  forbidden(message, data) {
    this.throw(403, message, data);
  }

  notAuthorized(message, data) {
    this.throw(401, message, data);
  }

  /**
   * Allows you to skip directly to actions from before chain
   */
  skip() {
    throw new SkipError('Skipping Directly to Action');
  }

  /**
   * Exit the controller / action immediately without responding
   */
  exit() {
    throw new ExitError('Exiting Controller/Action');
  }
}

module.exports = Context;

/**
 * Response delegation.
 */

delegate(Context.prototype, 'response')
  .method('redirect')
  .method('set')
  .method('append')
  .method('send')
  //.method('render')
  .method('json')
  .method('status')
  .method('getTime')
  .access('type')
  .access('length')
  .access('lastModified')
  .access('etag')
  .getter('headerSent')
  .getter('writable');

/**
 * Request delegation.
 */

delegate(Context.prototype, 'request')
  .method('acceptsLanguages')
  .method('acceptsEncodings')
  .method('acceptsCharsets')
  .method('accepts')
  .method('get')
  .method('is')
  .method('param')
  .method('queryString')
  .access('querystring')
  .access('idempotent')
  .access('socket')
  .access('search')
  .access('path')
  .access('url')
  .access('session')
  .getter('originalUrl')
  .getter('i18n')
  .getter('method')
  .getter('body')
  .getter('params')
  .getter('query')
  .getter('href')
  .getter('subdomains')
  .getter('protocol')
  .getter('host')
  .getter('hostname')
  .getter('header')
  .getter('headers')
  .getter('secure')
  .getter('stale')
  .getter('fresh')
  .getter('ips')
  .getter('ip');