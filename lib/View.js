"use strict";

var path = require('path');
var ext = path.extname;
var base = path.basename;
var dir = path.dirname;
var ejs = require('ejs');
var _ = require('lodash');

class View {
  /**
   * Register Views with Express
   *
   * @param http
   */
  static registerWithExpress(http) {
    http.app.set('views', path.resolve(sand.appPath + http.config.view.path));
    http.app.set('view engine', http.config.view.engine);
  }

  /**
   * Override Render function to support
   * special vars and to add layout support
   *
   * @param {Response} res - the response object
   * @param {Http} http - the http object
   * @param {Context} context
   */
  static applyMixin(context) {
    let config = sand.http.config;
    context._render = context.res.render;

    let logView = sand.http.log.as('http:view');

    context.render = function (view, data, fn) {
      if ('function' == typeof data) {
        fn = data;
        data = {};
      }

      data = data || {};

      // lets add view helpers
      data.view = View.viewHelpers();
      //data.require = require;

      // lets find the assets file
      //var paths = self.getPaths(view);
      context._render(view, data, function (err, result) {
        if (err) {
          // There was an error rendering, throw a 500
          logView.error(err.message);

          if ('function' === typeof fn) {
            return fn(err, null);
          }

          context.throw(err);
        } else {
          // We got the view now render the layout
          // Lets create the variables
          _.merge(data, {
            js: View.getJs(),
            css: View.getCss()
          }, View.getData());

          let layout = ('undefined' !== typeof data.layout) ? data.layout : config.view.layout;

          if (layout === false) {
            if ('function' === typeof fn) {
              return fn(err, result);
            }

            context.send(result);
          } else {
            data.body = result;
            context._render(View.getPaths(layout, true, config).full, data, function (err, result) {
              if (err) {
                logView.error(err.message);
              }

              if ('function' === typeof fn) {
                return fn(err, result);
              }

              if (err) {
                // There was an error rendering, throw a 500
                context.throw(err);
              } else {
                context.send(result);
              }
            }.bind(this));
          }
        }
      });
    };
  }

  /**
   * Get the paths for the views and layouts
   *
   * @param view
   * @param layout
   * @param config
   * @returns {{view, dir: *, ext: *}}
   */
  static getPaths(view, layout, config) {
    layout = 'undefined' === typeof layout ? false : layout;

    var ext = View.getExt(view);

    var paths = {
      view: base(view, ext),
      dir: dir(view),
      ext: ext
    };

    paths.full = path.resolve(sand.appPath + (layout ? config.view.layoutPath : config.view.path), paths.dir, paths.view + paths.ext);

    return paths;
  }

  /**
   * Get the path extension
   * defaults to .ejs
   *
   * @param {String} path - the path string
   * @returns {string}
   */
  static getExt(path) {
    return ext(path) || '.ejs';
  }

  /**
   * Creates default view variables and adds
   * convenience functions to yor views to
   * add css, js, ejs, title, set
   * @returns {{css: View.css, js: View.js, ejs: View.ejs, set: View.set, title: *}}
   */
  static viewHelpers() {
    process.domain.view = {
      _css: [],
      _js: [],
      _ejs: [],
      _data: {}
    };

    return {
      css: View.css,
      js: View.js,
      ejs: View.ejs,
      set: View.set,
      title: _.curry(View.set)('title')
    }
  }

  /**
   * Add css file to request
   *
   * @param {Array|string} css
   */
  static css(css) {
    View.addDomainData(process.domain.view._css, css);
  }

  /**
   * Add JS files to request
   *
   * @param {Array|string} js
   */
  static js(js) {
    View.addDomainData(process.domain.view._js, js);
  }

  /**
   * Add external js to request
   *
   * @param {Array|string} js
   */
  static ejs(js) {
    View.addDomainData(process.domain.view._ejs, js);
  }

  /**
   * Add data to be accessible in other views
   *
   * @param {string} name - the name of the variable
   * @param {*} value = the value of the variable
   */
  static set(name, value) {
    process.domain.view._data[name] = value;
  }

  /**
   * Add data to variable
   *
   * @param {Object} variable - variable reference to add too
   * @param {Array|string} data - data to add to variable
   */
  static addDomainData(variable, data) {
    if (_.isArray(data)) {
      _.merge(variable, data);
    } else {
      variable.push(data);
    }
  }

  /**
   * Process CSS and returns individual html
   * tags for each of your files
   *
   * TODO: Add Minification support
   *
   * @returns {string}
   */
  static getCss() {
    var css = _.unique(process.domain.view._css);

    var cssStr = '';

    _.each(css, function (name) {
      cssStr += '<link type="text/css" rel="stylesheet" href="/css/' + name + '.css">';
    });

    return cssStr;
  }

  /**
   * Process JS and return individual html
   * tags for each of your files
   *
   * TODO: Add Minification support
   *
   * @returns {string}
   */
  static getJs() {
    var js = _.unique(process.domain.view._js);
    var ejs = _.unique(process.domain.view._ejs);

    var jsStr = '';

    _.each(ejs, function (name) {
      jsStr += '<script type="text/javascript" src="' + name + '"></script>';
    });

    _.each(js, function (name) {
      jsStr += '<script type="text/javascript" src="/js/' + name + '.js"></script>';
    });

    return jsStr;
  }

  /**
   * Get raw data
   *
   * @returns {process.domain.view._data|{}}
   */
  static getData() {
    return process.domain.view._data;
  }
}

module.exports = View;