"use strict";

const fs = require('fs');
const crypto = require('crypto');
const gm = require('gm');
const stream2buffer = require('stream-to-buffer');
const streamifier = require('streamifier');
const XRegExp = require('xregexp').XRegExp;
const co = require('co');

const IMAGE_REGEX = XRegExp('^\/ai\/(?<width>\\d+)x(?<height>\\d+)(?<x2>@2x)?\/(?<path>.+\\.(?<ext>jpe?g|png|gif))(?:\\?(?:.+)?)?$', 'i');
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

    // Ensure the file exists
    try {
      fs.statSync(mkpath(imagesDir, matches.path));
    } catch (e) {
      return next();
    }

    // collect the adapted dimensions
    let width = parseInt(matches.width);
    let height = parseInt(matches.height);
    let crop = !!('undefined' !== typeof req.query.crop && req.query.crop == 1);
    let trim = !!(typeof req.query.trim !== 'undefined' ? req.query.trim == 1 : config.trim);
    let bg = req.query.bg ? '#' + req.query.bg : undefined;
    let is2x = matches.x2 || req.query.x2;

    // for 2x images
    if (is2x) {
      width *= 2;
      height *= 2;
    }


    let path = matches.path;
    let mimetype = MIME_TYPES[matches.ext.toLowerCase()];

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
        try {
          var buffer = yield getCache();
        } catch(e) {
          sand.warn('Could not get cache');
        }

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

      let img = gm(config.stream(path) || mkpath(imagesDir, path));

      img.size(function(err, nativeSize) {
        if (err || typeof nativeSize == 'undefined' || typeof nativeSize.width == 'undefined' || typeof nativeSize.height == 'undefined') {
          return callback(err || 'Failed to retrieve image dimensions.');
        }

        /**
         * Validate dimensions & determine sizing rules.
         */
        let imageWidth = width, imageHeight = height;       // The size of the image itself
        let canvasWidth = width, canvasHeight = height;     // The size of the canvas around the image
        let allowResize;

        // If we're resizing, ensure we never exceed the native image dimensions.
        if (!imageWidth && !imageHeight) {
          // Using native image size, no resizing necessary.
          imageWidth = nativeSize.width;
          imageHeight = nativeSize.height;
          canvasWidth = nativeSize.width;
          canvasHeight = nativeSize.height;

          allowResize = false;
        } else if ((imageWidth && !imageHeight) || (!imageWidth && imageHeight)) {
          // One size provided, scale the other proportionally.
          if (imageWidth) {
            imageHeight = Math.round(imageWidth * (nativeSize.height / nativeSize.width));
            canvasHeight = imageHeight >= nativeSize.height ? nativeSize.height : imageHeight;  // trim extra space from canvas height
          } else {
            imageWidth = Math.round(imageHeight * (nativeSize.width / nativeSize.height));
            canvasWidth = imageWidth >= nativeSize.width ? nativeSize.width : imageWidth;       // trim extra space from canvas width
          }

          allowResize = imageWidth < nativeSize.width && imageHeight < nativeSize.height;
        } else {
          // Two sizes provided.
          if (imageWidth > nativeSize.width && imageHeight > nativeSize.height) {
            // Do not exceed the native image size.
            imageWidth = nativeSize.width;
            imageHeight = nativeSize.height;
            allowResize = false;
          } else {
            if (imageWidth > nativeSize.width) {
              // Preserve requested height, but correct the width.
              imageWidth = 0;   // auto
            } else if (imageHeight > nativeSize.height) {
              // Preserve requested width, but correct the height.
              imageHeight = 0;  // auto
            }

            // Sizes are fine, fit into the requested box.
            allowResize = true;
          }
        }

        /**
         * Adapt the image.
         */
        img
          .out('-background', bg || 'white');

        if (allowResize) {
          let w = imageWidth == 0 ? null : (crop ? `${imageWidth}^` : imageWidth);
          let h = imageHeight == 0 ? null : (crop ? `${imageHeight}^` : imageHeight);

          img = img.resize(w, h);
        }

        img
          .gravity('Center')
          .extent(canvasWidth, canvasHeight)
          .quality(90)
          .strip()
          .stream(function(err, stdout, stderr) {
            if (err) {
              return callback(err);
            }

            // calling .trim() on a GM object seems to have no effect,
            // so we need to perform that on the buffer if necessary.
            if (!trim) {
              return callback(null, stdout);
            }

            gm(stdout).trim().stream(function(err, stdout, stderr) {
              if (err) {
                return callback(err);
              }

              callback(null, stdout);
            });
          });

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

            if (!buffer || !buffer.length) {
              return resolve(buffer);
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
      let paramString =
        width + 'x' + height + '-'
        + path
        + (is2x ? '-@2x' : '')
        + (bg ? `_${bg}` : '')
        + (crop ? '_crop' : '')
        + (trim ? '_trim' : '');

      return paramString + '-' + crypto.createHash('sha1').update(paramString).digest('hex');
    }

  };

};

function mkpath(dir, rel) {
  return dir.replace(/\/$/, '') + '/' + rel.replace(/^\//, '');
}