var Class = require('sand').Class;
var path = require('path');
var ext = path.extname;
var base = path.basename;
var dir = path.dirname;

var View = exports = module.exports = Class.extend({
  construct: function(config) {
    this.config = config;
  },

  registerWithExpress: function(express) {
    express.set('views', sand.appPath + this.config.views.path);
    express.set('view engine', this.config.views.engine);

    express.use(function(req, res, next) {
      this.mixinRender(res);
      next();
    }.bind(this))
  },

  mixinRender: function(res) {
    var self = this;
    var oldRender = res.render;

    res.render = function(view, options, fn) {
      console.log(view);

      // lets find the assets file
      var paths = self.getPaths(view);
      console.log(paths);

      oldRender.apply(this, [paths.view + paths.ext, options, fn]);
    };
  },

  getPaths: function(view) {
    var ext = this.getExt(view);

    return {
      view: base(view, ext),
      dir: dir(view),
      ext: ext
    }
  },

  getExt: function(path) {
    return ext(path) || '.' + this.config.views.engine
  }
});