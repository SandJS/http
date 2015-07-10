"use strict";

// Modules
let fs = require('fs');
let XRegExp = require('xregexp').XRegExp;
let Context = require('./Context');
let _ = require('lodash');
let co = require('co');
const bind = require('co-bind');

/**
 * Router designed to route
 * to controller/action
 */
class Router {

  static routeMiddleware(req, res) {
    // Lets find the route
    let routes = Router.getRoutes(req.method);
    let context = new Context(req, res);

    try {
      if (!routes) {
        // No Routes to check, Probably unsupported method
        context.notFound();
      }

      // Lets loop through the routes and match them
      for (let route of routes) {

        let matches = route.regex.xexec(req.path);
        if (matches) {
          if (Router.callController(context, route, matches)) {
            return;
          }
        }
      }

      // Lets check for a default Controller/Action math
      var regex = XRegExp('^/(?<controller>(?:[^\\WA-Z][\\w]*/)*[A-Z][\\w\\\\]*)/?(?<action>\\w+)?/?(?<params>[^\\?]+)?\\??.*$');
      let matches = regex.xexec(req.path);
      if (matches && matches.controller && matches.action) {
        let route = {
          regex: regex,
          ctrlAction: `${matches.controller}.${matches.action}`
        };

        if (Router.callController(context, route, matches)) {
          return;
        }
      }

      context.notFound();
    } catch(e) {
      context.onError(e);
    }
  }

  /**
   * Find the Controller/Action then call
   * the before, then the action
   *
   * @param {Context} context - the context object
   * @param {object} route - object with regex and ctrlAction
   *
   * @returns {boolean} - TRUE on successful call, FALSE otherwise
   */
  static callController(context, route, matches) {
    // Parse out the real controller action
    let ctrlAction = XRegExp.replace(context.req.path, route.regex, route.ctrlAction);
    let split = ctrlAction.split('.');

    // If we have the right number, controller/action
    if (2 === split.length) {
      let controller = Router.getController(split[0]);
      if (!controller) {
        return false;
      }

      // Make sure the action exists
      if ('function' !== typeof controller[split[1]]) {
        if ('function' === typeof controller.prototype[split[1]]) {
          sand.http.warn(`${split[0] + '.' + split[1]} was found as an instance method, you probably meant to mark it as static`);
        }
        return false;
      }

      context.controllerName = split[0];
      context.actionName = split[1];

      // Lets add Named params
      for (var key in matches) {
        if (!matches.hasOwnProperty(key)) {
          continue;
        }

        if (!_.isNumber(key)) {
          context.req.params[key] = matches[key];
        }
      }

      try {
        controller.before.call(context, function () {
          let action = controller[split[1]];
          if (action.constructor.name === 'GeneratorFunction') {
            co(bind(action, context)).catch(context.onError.bind(context));
          } else {
            action.call(context);
          }
        });
      } catch(e) {
        context.onError(e);
      }

      return true;
    }

    return false;
  }

  /**
   * Load controllers from disk and store
   * in memory for later use
   *
   * @param http
   */
  static loadControllers(http) {
    let config = http.config;
    let controllerPath = require('path').normalize(sand.appPath + config.controllerPath);

    if (!fs.existsSync(controllerPath)) {
      http.log.warn("WARN: Missing controllers directory. Skipping loading of controllers...".yellow);
      return;
    }

    let controllers = require('require-all')({
      dirname: controllerPath,
      filter: /(\w+)\.js/
    });

    Router.controllers = flattenObject(controllers);
  }

  /**
   * Load the routes and split them up into
   * sections separated by method
   *
   * @param http
   */
  static loadRoutes(http) {
    let config = http.config;
    let routesPath = require('path').normalize(sand.appPath + config.routesPath);

    if (!routesPath.endsWith('.js')) {
      routesPath += '.js';
    }

    if (!fs.existsSync(routesPath)) {
      http.log.warn(`WARN: Missing routes file: ${routesPath}. Skipping the loading of routes...`);
      return;
    }

    // Load Routes Config
    var routes = require(routesPath);

    // Loop through routes
    for (var key in routes) {
      if (routes.hasOwnProperty(key)) {
        // Get Method and Route
        let split = Router.getMethodAndRegex(key, http);
        if (!split) {
          http.warn(`Invalid route key: ${key}`);
          continue;
        }

        // If they passed and object we need to treat it differently
        if ('object' === typeof routes[key]) {
          // For each method add new route
          for(var meth in routes[key]) {
            if (routes[key].hasOwnProperty(meth)) {
              Router.addRoute(meth, split.regex, routes[key][meth]);
            }
          }
        } else if ('string' === typeof routes[key]) {
          // Lets add the simple route
          Router.addRoute(split.method, split.regex, routes[key]);
        } else {
          http.warn('Invalid Controller/Action', routes[key]);
        }
      }
    }
  }

  /**
   * Add the route to the global object
   *
   * @param {string} method - the HTTP method
   * @param {string} regex - the route regex
   * @param {string} action - the controller/action
   */
  static addRoute(method, regex, action) {
    method = method.toUpperCase();

    // Create the method routes holder if it doesn't exist
    if ('undefined' === typeof Router.routes[method]) {
      Router.routes[method] = [];
    }

    // Add the route
    Router.routes[method].push({
      regex: XRegExp(regex),
      ctrlAction: action
    });
  }

  static getMethodAndRegex(str) {
    let split = str.split(' ');
    var meth = 'GET';
    var regex = '';

    // Lets split out the method and regex
    if (2 === split.length) {
      meth = split[0];
      regex = split[1];
    } else if (1 === split.length) {
      regex = split[0];
    } else {
      return null;
    }

    // If this string is not a regex, add `^` and `$`
    if (!regex.startsWith('^') && !regex.endsWith('$')) {
      regex = `^${regex}$`;
    }

    return {
      method: meth,
      regex: regex
    };
  }

  /**
   * Get the routes attached to a HTTP method
   *
   * @param {string} method - the HTTP method
   *
   * @returns {*}
   */
  static getRoutes(method) {
    return Router.routes[method.toUpperCase()];
  }

  /**
   * Get the controller instance if it exists
   * null otherwise
   *
   * @param {string} name - controller name
   *
   * @returns {*}
   */
  static getController(name) {
    name = name.replace('/', '.');
    if ('function' === typeof Router.controllers[name]) {
      return Router.controllers[name];
    }

    return null;
  }
}

Router.controllers = null;
Router.routes = {};

module.exports = function(http) {
  Router.loadControllers(http);
  Router.loadRoutes(http);

  return Router.routeMiddleware;
};

function flattenObject(obj) {
  var toReturn = {};

  for (var i in obj) {
    if (!obj.hasOwnProperty(i)) {
      continue;
    }

    if ('object' === typeof obj[i] && obj !== null) {
      var flatObject = flattenObject(obj[i]);
      for (var x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;

        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = obj[i];
    }
  }
  return toReturn;
}