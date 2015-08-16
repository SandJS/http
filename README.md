sand-http
=========

A lightweight http server

## Middleware Routes
```
module.exports = {
    'POST /v1/ad/save': {
        action: 'Ad.save',
        middleware: function(req, res, next) {
          next();
        }
    },

    'POST /v1/ad/test': [function(req, res, next) {next();}, 'Ad.test']
};
  ```