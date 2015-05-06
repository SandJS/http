"use strict";

const fs = require('fs');
const crypto = require('crypto');
const gm = require('gm');
const stream2buffer = require('stream-to-buffer');
const streamifier = require('streamifier');
const XRegExp = require('xregexp').XRegExp;
const co = require('co');

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

  if (config.useMemcache && sand.memcache) {
    put = function(key, buf, callback) {
      sand.memcache.set(key, buf, config.cacheLife, callback);
    };
    get = function(key, callback) {
      sand.memcache.get(key, callback);
    };
  }

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

    // collect the adapted dimensions
    let width = parseInt(matches.width);
    let height = parseInt(matches.height);

    let is2x = matches.x2 || req.query.x2;

    // for 2x images
    if (is2x) {
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

    co(function *() {

      try {

        // check if we have cache
        var buffer = yield getCache();

        if (buffer) {
          // if we do, then return it right away
          let stream = streamifier.createReadStream(buffer);
          return send(stream);
        }

        // otherwise, make a buffer and cache it
        buffer = yield putCache();

        if (!buffer) {
          // we should never get here!!! buffer should always be returned
          return next(new Error('AI: Unable to retrieve image! (' + getKey() + ')'));
        }

        // change buffer to stream and return
        let stream = streamifier.createReadStream(buffer);
        return send(stream);


      } catch(e) {
        http.log(e.message || e);
        return next(e);
      }

    });

    // Helper functions

    function send(stream) {
      res.setHeader('content-type', mimetype);
      stream.pipe(res);
    }

    /**
     * Adapts the image to the proper dimensions with cropping
     *
     * @returns {Promise}
     */
    function adapt(callback) {
      /*
       * For Graphics Magick docs: http://www.graphicsmagick.org/GraphicsMagick.html#details-geometry
       * Inspiration: http://stackoverflow.com/questions/14705152/thumbnails-from-graphics-magick-without-upscaling
       */

      gm(mkpath(imagesDir, path))
        .resize(`${width}^`, `${height}^`)
        .gravity('Center')
        .extent(width, height)
        .stream(function(err, stdout, stderr) {
          if (err) {
            return callback(err);
          }
          callback(null, stdout);
        });
    }

    /**
     * Fetches an image buffer from the cache
     *
     * @returns {Promise}
     */
    function getCache() {
      return new Promise(function(resolve, reject) {
        // create and fetch the cache key
        get(getKey(), function(err, data) {
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });
    }

    /**
     * Creates an adapted image buffer | puts it in the cache | returns the buffer
     *
     * @returns {Promise}
     */
    function putCache() {
      return new Promise(function(resolve, reject) {
        // make the cache key
        let key = getKey();

        // adapt the image
        adapt(function(err, stdout, stderr) {
          if (err) {
            return reject(err);
          }

          // convert the new image stream to buffer
          stream2buffer(stdout, function(err, buffer) {
            if (err) {
              return reject(err);
            }

            // put the buffer in the cache
            put(key, buffer, function(err, data) {
              if (err) {
                return reject(err);
              }

              // return the buffer
              resolve(buffer);
            });
          });
        });
      });
    }

    /**
     * Builds a cache key for the adapted image
     *
     * @returns {string}
     */
    function getKey() {
      let paramString = width + 'x' + height + '-' + path + (is2x ? '-@2x' : '');
      return paramString + '-' + crypto.createHash('sha1').update(paramString).digest('hex');
    }

  };

};

function mkpath(dir, rel) {
  return dir.replace(/\/$/, '') + '/' + rel.replace(/^\//, '');
}