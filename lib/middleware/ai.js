"use strict";

const fs = require('fs');
const crypto = require('crypto');
const gm = require('gm');
const stream2buffer = require('stream-to-buffer');
const streamifier = require('streamifier');
const XRegExp = require('xregexp').XRegExp;

const IMAGE_REGEX = XRegExp('^\/ai\/(?<width>\\d+)x(?<height>\\d+)(?<x2>@2x)?\/(?<path>.+\\.(?<ext>jpe?g|png|gif))(?:\\?(?:.+)?)?$');
const MIME_TYPES = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif'
};

module.exports = function(http) {
  let log = http.log.as('http:ai');
  let config = http.config.ai || {};

  let imagesDir = mkpath(sand.appPath, config.imagesDir);

  let put = config.put;
  let get = config.get;

  return function(req, res, next) {

    // ignore if we're not GETing
    if ('GET' !== req.method) {
      return next();
    }

    // check if route matches
    let matches = IMAGE_REGEX.xexec(req.originalUrl);

    if (!matches) {
      return next();
    }

    let width = parseInt(matches.width);
    let height = parseInt(matches.height);

    // for 2x images
    if (matches.x2) {
      width *= 2;
      height *= 2;
    }

    let path = matches.path;
    let mimetype = MIME_TYPES[matches.ext];

    // we don't know how to return this one
    if (!mimetype) {
      return next();
    }

    if (!config.useCache) {
      return adapt(function(err, stdout) {

        if (err) {
          log(err.message || err);
          return next(err);
        }

        send(stdout);

      });
    }

    getCache(function(err, buffer) {
      if (err) {
        log(err.message || err);
        return next(err);
      }

      if (buffer) {
        let stream = streamifier.createReadStream(buffer);
        return send(stream);
      }

      putCache(function(err) {
        if (err) {
          log(err.message || err);
          return next(err);
        }

        adapt(function(err, stdout) {

          if (err) {
            log(err.message || err);
            return next(err)
          }

          getCache(function(err, buffer) {

            if (err) {
              log(err.message || err);
              return next(err);
            }

            if (buffer) {
              let stream = streamifier.createReadStream(buffer);
              return send(stream);
            }

            res.send(404);

          });

        });

      });

    });

    adapt(function(err, stdout, stderr) {

      if (err) {
        log(err.message || err);
        return next(err);
      }

      send(stdout);

    });

    // Helper functions

    function send(stream) {
      res.setHeader('content-type', mimetype);
      stream.pipe(res);
    }

    function adapt(callback) {
      /*
       * For Graphics Magick docs: http://www.graphicsmagick.org/GraphicsMagick.html#details-geometry
       * Inspiration: http://stackoverflow.com/questions/14705152/thumbnails-from-graphics-magick-without-upscaling
       */
      gm(mkpath(imagesDir, path))
        .resize(`${width}^`, `${height}^`)
        .gravity('Center')
        .extent(width, height)
        .stream(callback);
    }

    function getCache(callback) {
      get(getKey(), callback);
    }

    function putCache(callback) {
      let key = getKey();
      adapt(function(err, stdout, stderr) {
        if (err) {
          return callback(err);
        }

        stream2buffer(stdout, function(err, buffer) {
          if (err) {
            return callback(buffer);
          }

          put(key, buffer, callback);
        });
      });
    }

    function getKey() {
      return width + 'x' + height + '-' + path + '-' + crypto.createHash('sha1').update(width + 'x' + height + '-' + path).digest('hex');
    }

  };

};

function mkpath(dir, rel) {
  return dir.replace(/\/$/, '') + '/' + rel.replace(/^\//, '');
}