var Class = require('sand').Class;
var path = require('path');
var ext = path.extname;
var base = path.basename;
var dir = path.dirname;
var ejs = require('ejs');

var View = exports = module.exports = Class.extend({
  construct: function(config) {
    this.config = config;
  },

  registerWithExpress: function(express) {
    express.set('views', sand.appPath + this.config.views.path);
    express.set('view engine', 'ejs');

    express.use(function(req, res, next) {
      this.mixinRender(res);
      next();
    }.bind(this))
  },

  mixinRender: function(res) {
    var self = this;
    res._render = res.render;

    res.render = function(view, data, fn) {
      if (_.isFunction(data)) {
        fn = data;
        data = {};
      }

      data = data || {};

      // lets add view helpers
      data.view  = View.viewHelpers();

      // lets find the assets file
      var paths = self.getPaths(view);

      self.renderView(paths.full, data, function(err, result) {
        if (err) {
          // There was an error rendering, throw a 500
          self.log(err);
          res.status(500).send('Internal Server Error');
        } else {
          // We got the view now render the layout
          // Lets create the variables
          _.merge(data, {
            js: View.getJs(),
            css: View.getCss()
          }, View.getData());

          var layout = !_.isUndefined(data.layout) ? data.layout : self.config.views.layout;

          if (layout === false) {
            res.send(result);
          } else {
            data.body = result;
            console.log(self.getPaths(layout, true).full);
            self.renderView(self.getPaths(layout, true).full, data, function(err, result) {
              if (err) {
                // There was an error rendering, throw a 500
                self.log(err);
                res.status(500).send('Internal Server Error');
              } else {
                res.send(result);
              }
            })
          }
        }
      })
    };
  },

  getPaths: function(view, layout) {
    layout = _.isUndefined(layout) ? false : layout;

    var ext = this.getExt(view);

    var paths = {
      view: base(view, ext),
      dir: dir(view),
      ext: ext
    };

    paths.full = path.resolve(sand.appPath + (layout ? this.config.views.layoutPath : this.config.views.path), paths.view + paths.ext);

    return paths;
  },

  getExt: function(path) {
    return ext(path) || '.ejs';
  },

  renderView: function(view, data, cb) {
    ejs.renderFile(view, data, cb);
  }
}, {
  viewHelpers: function() {
    process.domain.views = {
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
  },

  css: function(css) {
    View.addDomainData(process.domain.views._css, css);
  },

  js: function(js) {
    View.addDomainData(process.domain.views._js, js);
  },

  ejs: function(js) {
    View.addDomainData(process.domain.views._ejs, js);
  },

  set: function(name, value) {
    process.domain.views._data[name] = value;
  },

  addDomainData: function(variable, data) {
    if (_.isArray(data)) {
      _.merge(variable, data);
    } else {
      variable.push(data);
    }
  },

  getCss: function() {
    var css = _.unique(process.domain.views._css);

    var cssStr = '';

    _.each(css, function(name) {
      cssStr = '<link type="text/css" rel="stylesheet" href="/css/' + name + '.css">';
    });

    return cssStr;
  },

  getJs: function() {
    var js = _.unique(process.domain.views._js);
    var ejs = _.unique(process.domain.views._ejs);

    var jsStr = '';

    console.log(ejs);
    _.each(ejs, function(name) {
      jsStr += '<script type="text/javascript" src="' + name + '"></script>';
    });

    _.each(js, function(name) {
      jsStr += '<script type="text/javascript" src="/js/' + name + '.js"></script>';
    });

    return jsStr;
  },

  getData: function() {
    return process.domain.views._data;
  }
});