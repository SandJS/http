"use strict";

var path = require('path');
var ext = path.extname;
var base = path.basename;
var dir = path.dirname;
var ejs = require('ejs');
var _ = require('lodash');
var co = require('co');

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
      co(function *() {
        if ('function' == typeof data) {
          fn = data;
          data = {};
        }

        data = data || {};

        let extraData = {};
        if (typeof config.view.data === 'function') {
          if (config.view.data.constructor.name == 'GeneratorFunction') {
            extraData = yield config.view.data(context);
          } else {
            extraData = config.view.data(context);
          }
        } else {
          extraData = config.view.data;
        }

        // lets add view helpers
        data.view = View.viewHelpers(context);
        _.merge(data, extraData);

        context._render(view, data, function (err, result) {
          if (err) {
            // There was an error rendering, throw a 500
            logView.error(err.message);

            if ('function' === typeof fn) {
              Promise.resolve();
              return fn(err, null);
            }

            context.throw(err);
            Promise.reject(err);
          } else {
            // We got the view now render the layout
            // Lets create the variables
            _.merge(data, extraData, {
              js: View.getJs(context),
              css: View.getCss(context),
              meta: View.getMeta(context),
              link: View.getLink(context),
              printJS: View.printJS,
              printCSS: View.printCSS
            }, View.getData(context));

            let layout = ('undefined' !== typeof data.layout) ? data.layout : config.view.layout;

            if (layout === false) {
              if ('function' === typeof fn) {
                Promise.resolve();
                return fn(err, result);
              }

              context.send(result);
              Promise.resolve();
            } else {
              data.body = result;
              context._render(View.getPaths(layout, true, config).full, data, function (err, result) {
                if (err) {
                  logView.error(err.message);
                }

                if ('function' === typeof fn) {
                  Promise.resolve();
                  return fn(err, result);
                }

                if (err) {
                  // There was an error rendering, throw a 500
                  context.throw(err);
                  Promise.reject(err);
                } else {
                  context.send(result);
                  Promise.resolve();
                }
              }.bind(this));
            }
          }
        });
      }).catch(function(e) {
        if ('function' === typeof fn) {
          return fn(err, result);
        }

        context.onError(e);
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
  static viewHelpers(context) {
    context.view = {
      _css: [],
      _js: [],
      _ejs: [],
      _meta: [],
      _link: [],
      _data: {}
    };

    return {
      css: View.css.bind(context),
      js: View.js.bind(context),
      ejs: View.ejs.bind(context),
      meta: View.meta.bind(context),
      link: View.link.bind(context),
      metaDescription: View.metaDescription.bind(context),
      metaKeywords: View.metaKeywords.bind(context),
      set: View.set.bind(context),
      title: _.curry(View.set.bind(context))('title')
    }
  }

  /**
   * Add css file to request
   *
   * @param {Array|string} css
   */
  static css(css) {
    View.addDomainData(this.view._css, css);
  }

  /**
   * Add JS files to request
   *
   * @param {Array|string} js
   */
  static js(js) {
    View.addDomainData(this.view._js, js);
  }

  /**
   * Add external js to request
   *
   * @param {Array|string} js
   */
  static ejs(js) {
    View.addDomainData(this.view._ejs, js);
  }

  /**
   * Add meta to request
   *
   * @param {Array|object} meta
   */
  static meta(meta) {
    View.addDomainData(this.view._meta, meta);
  }

  /**
   * Add link to request
   *
   * @param {Array|object} link
   */
  static link(link) {
    View.addDomainData(this.view._link, link);
  }

  /**
   * Add Meta Description
   *
   * @param {string} content
   */
  static metaDescription(content) {
    View.meta.call(this, {
      name: 'description',
      content: content
    });
  }

  /**
   * Add Meta Keywords
   *
   * @param {string} content
   */
  static metaKeywords(content) {
    View.meta.call(this, {
      name: 'keywords',
      content: content
    });
  }

  /**
   * Add data to be accessible in other views
   *
   * @param {string} name - the name of the variable
   * @param {*} value = the value of the variable
   */
  static set(name, value) {
    this.view._data[name] = value;
  }

  /**
   * Add data to variable
   *
   * @param {Object} variable - variable reference to add too
   * @param {Array|string} data - data to add to variable
   */
  static addDomainData(variable, data) {
    if (_.isArray(data)) {
      data.forEach(function(v) {
        variable.push(v);
      });
    } else {
      variable.push(data);
    }
  }

  /**
   * Process Meta and returns individual html
   * tags for each item
   *
   * @returns {string}
   */
  static getMeta(context) {
    var meta = _.unique(context.view._meta);

    return this.printMeta(meta);
  }

  /**
   * Process CSS and returns individual html
   * tags for each of your files
   *
   * @returns {string}
   */
  static getLink(context) {
    var link = _.unique(context.view._link);

    return this.printLink(link);
  }

  /**
   * Process CSS and returns individual html
   * tags for each of your files
   *
   * @returns {string}
   */
  static getCss(context) {
    var css = _.unique(context.view._css);

    return this.printCSS(css);
  }

  /**
   * Process JS and return individual html
   * tags for each of your files
   *
   * @returns {string}
   */
  static getJs(context) {
    var js = _.unique(context.view._js);
    var ejs = _.unique(context.view._ejs);

    var jsStr = '';

    _.each(ejs, function (name) {
      jsStr += '<script type="text/javascript" src="' + name + '"></script>';
    });

    jsStr += this.printJS(js);

    return jsStr;
  }

  /**
   * Return the JS files either combined into one script tag or
   * individual tags
   *
   * @param {Array} files
   */
  static printJS(files) {
    let jsStr = '';

    if (!sand.static || ('development' === sand.env && sand.static && !sand.static.config.minified.force)) {
      _.each(files, function (name) {
        jsStr += `<script type="text/javascript" src="${View.getURL('js', '/js/' + name + '.js')}"></script>`;
      });
    } else {
      if (files && files.length > 0) {
        jsStr += `<script type="text/javascript" src="${View.getURL('js', sand.static.minifiedJSURL(files))}"></script>`
      }
    }

    return jsStr;
  }


  /**
   * Return the CSS files either combined into one script tag or
   * individual tags
   *
   * @param {Array} files
   */
  static printCSS(files) {
    let cssStr = '';

    if (!sand.static || ('development' === sand.env && sand.static && !sand.static.config.minified.force)) {
      _.each(files, function (name) {
        cssStr += `<link type="text/css" rel="stylesheet" href="${View.getURL('css', '/css/' + name + '.css')}">`;
      });
    } else {
      if (files && files.length > 0) {
        cssStr += `<link type="text/css" rel="stylesheet" href="${View.getURL('css', sand.static.minifiedCSSURL(files))}">`
      }
    }

    return cssStr;
  }

  /**
   * Return Meta Tags
   *
   * @param {Array} meta
   */
  static printMeta(meta) {
    let metaStr = '';

    _.each(meta, function (obj) {
      metaStr += '<meta ';

      _.each(obj, function(value, key) {
        metaStr += `${key} ="${value}" `;
      });

      metaStr += '>';
    });

    return metaStr;
  }

  /**
   * Return Meta Tags
   *
   * @param {Array} meta
   */
  static printLink(meta) {
    let linkStr = '';

    _.each(meta, function (obj) {
      linkStr += '<link ';

      _.each(obj, function(value, key) {
        linkStr += `${key} ="${value}" `;
      });

      linkStr += '>';
    });

    return linkStr;
  }

  /**
   * Return the URL with the possible CDN
   *
   * @param {String} type - the url type
   * @param {String} url - the relative url
   *
   * @returns {String}
   */
  static getURL(type, url) {
    let baseURL = sand.http.config.cdn[type];

    return baseURL + url;
  }

  /**
   * Get raw data
   *
   * @returns {context.view._data|{}}
   */
  static getData(context) {
    return context.view._data;
  }
}

module.exports = View;