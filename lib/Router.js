"use strict";

// Modules
let fs = require('fs');
let XRegExp = require('xregexp').XRegExp;
let Context = require('./Context');
let _ = require('lodash');
let co = require('co');
const bind = require('co-bind');
const SkipError = require('./SkipError');
const ExitError = require('./ExitError');
const Q = require('q');

/**
 * Router designed to route
 * to controller/action
 */
class Router {

  static routeMiddleware(req, res) {
    // Lets find the route
    let routes = Router.getRoutes(req.method);
    let context = new Context(req, res);

    // Add the context to the domain
    sand.context = context;

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

      // Lets check for a default Controller/Action match
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
    let hasSpace = /\s/.test(ctrlAction);

    // If we have the right number, controller/action
    if (2 === split.length && !hasSpace) {
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

      co(function *() {
        try {
          // Execute the before, and then check if we should continue to the action
          yield controller.before.call(context);
        } catch(e) {
          if (e instanceof ExitError) {
            // Lets Exit Immediately
            return;
          }else if (!(e instanceof SkipError)) {
            return context.throw(e);
          }
        }

        if (route.middleware) {
          try {
            yield Router.callMiddleware(context, route.middleware);
          } catch (e) {
            sand.error('Middleware exception:', e);
            context.serverError('Middleware exception.');
          }
        }

        let action = controller[context.actionName];
        if ('function' === typeof action) {
          yield action.call(context);
        } else {
          context.serverError('Could not find action');
        }
      }).catch(context.onError.bind(context));

      return true;
    } else {
      // Lets check for redirect
      split = route.ctrlAction.split(/\s/);
      if (2 === split.length) {
        let code = parseInt(split[0]);
        let url = XRegExp.replace(context.req.path, route.regex, split[1]);
        if (301 === code || 302 === code) {
          context.redirect(code, url);
          return true;
        }
       }
    }

    return false;
  }

  static callMiddleware(context, middleware) {
    return co(function *() {
      if (!_.isArray(middleware)) {
        return Promise.resolve();
      }

      for (var m of middleware) {
        yield Q.nfcall(m, context.req, context.res);
      }
    });
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

        if (_.isArray(routes[key])) {
          Router.addRoute(split.method, split.regex, getRouteFromArray(routes[key]));
        } else if ('object' === typeof routes[key]) {
          // If they passed and object we need to treat it differently
          // For each method add new route
          for(var meth in routes[key]) {
            if (routes[key].hasOwnProperty(meth)) {
              if (_.indexOf(Router.methods, meth.toUpperCase()) !== -1) {
                if (_.isArray(routes[key][meth])) {
                  Router.addRoute(meth, split.regex, getRouteFromArray(routes[key][meth]));
                } else {
                  // Add supported Routes
                  Router.addRoute(meth, split.regex, routes[key][meth]);
                }
              } else if ('action' === meth.toLowerCase()) {
                let route = {
                  action: routes[key][meth]
                };

                if (routes[key].middleware) {
                  route.middleware = _.isArray(routes[key].middleware) ? routes[key].middleware : [routes[key].middleware];
                }
                Router.addRoute(split.method, split.regex, route);
              }
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

    function getRouteFromArray(array) {
      let action = routes[key].pop();
      let middleware = routes[key];
      return {
        action: action,
        middleware: middleware
      };
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

    let route = {
      regex: XRegExp(regex),
      ctrlAction: action
    };

    if (_.isObject(action)) {
      route.ctrlAction = action.action;
      route.middleware = action.middleware;
    }


    // Add the route
    Router.routes[method].push(route);
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
Router.methods = [
  'OPTIONS',
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'DELETE',
  'TRACE',
  'CONNECT'
];

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