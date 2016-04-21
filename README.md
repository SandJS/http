# HTTP Application Server Grain for Sand.js

This grain provides a full HTTP Application Server SDK. Features include 

- Automatic server lifecycle management
- Regular Expression based routing
- Request Middleware à la [Express.js](http://expressjs.com/)
- MVC style controllers and views
- A unique execution context for each web request
- Graceful error handling per request
- Other sand grains can extend the web server's functionality through `bindToContext`. (TODO expand on this)
- Supports (and encourages) usage of EcmaScript 6 syntactic goodness
- Battle tested in at least two production applications [Whym](https://getwhym.com) and [Blackfriday.fm](https://www.blackfriday.fm)
- Automatic image size generation.
- And much more!

## Install

`npm install --save sand-http`

## Components

Below is listed the basic project structure for an HTTP Application Server.

- `config/routes.js` contains the mapping of url patterns to controller/actions
- `config/http.js` contains the basic config for the server.
- `controllers/` contains the controllers where the server application logic is implemented.
- `views/` contains the views and layouts used to be rendered in the application.
- `views/layout/` contains the view layouts to be used in rendering views.
- `public/` hosted as static files. (i.e. CSS, JS, other static files)
- `app.js` to load the grain of course.


### Routes

Routes are exported as an object of Regular Expression properties and Controller/action combinations.

Properties are [XRegExp](http://xregexp.com/) compatible strings.
Values are `.` separated strings of the form `'ControllerName.actionName'`.

- Named properties are supported in route patterns. For example `'/users/(?<userId>\\d+)'`
- Note that shortcut character classes such as `\d`, `\w`, etc must be double escaped like `\\d`, `\\w`, etc.

### Controllers and Actions

A controller, the C of Model-View-Controller, is a class that extends `require('sand-http').Controller`.

An action is a _static Generator Function_ member of a controller that executes a piece of application logic.

All actions provide `this.req` and `this.res`: references to the HTTP request and response objects associated with the request.

## Usage

Here is a sample project.

`app.js`

```JavaScript
const Http = require('sand-http');
const Sand = require('sand');

let app = new Sand({log: '*'});
app.use(Http);
app.start();
```

`config/routes.js`

```JavaScript
module.exports = {
	'/': 'MyController.index'
};
```

`config/http.js`

```JavaScript
module.exports = {
	all: {
		port: 3000
	}
};
```

`controllers/MyController.js`

```JavaScript
"use strict";

const Helper = require('../classes/Helper');

const Controller = require('sand-http').Controller;

class MyController extends Controller {

	/*
	This is a controller action.
	
	Note that all controller actions are static Generator Functions.
	
	The `this` reference within the action is called a `Context` object. Sand.js provides `Context` objects. `Context` objects allow tracking a single line of execution. If you are familiar with PHP, their "scope" is similar to that of `$_GET`, etc.	
	By design, the `Context` object may be referenced by `sand.ctx` from anywhere in the application to obtain a reference to the `this` of the currently executing request. This functionality allows Helper classes (for example `Helper`) to obtain a reference to the currently executing request WITHOUT having to pass the `req` object as an argument or call the Helper functions with `req` bound as `this`.
	*/
	static *index() {

		// this.req.url == Helper.getUrl() is an example of the relationship between `this` and `sand.ctx`.

		let req = this.req; // Request object (just like express)
		let res = this.res; // Response object (just like express)
		req.pipe(res);
		
	}
	
}

module.exports = MyController;
```

`classes/Helper.js`

```JavaScript
"use strict";

// this is a helper class
class Helper {

	static getUrl() {
		return sand.ctx.req.url;
	}
	
}

module.exports = Helper;
```

After creating the above structure, run it as follows

```Bash
npm init
# ...
npm install --save sand sand-http
node app
```

## Adaptive Image

If enabled, this feature will recognize the route `/ai/<width>x<height>(@2x)?/your/path/to/the/static/image.(png|jpe?g|gif)` and will generate and return an image according to the width and height (and optionally @2x) specified. See [config.ai](#config) for specific details on using this feature.

Options include

- `<width>` - required
- `<height>` - required
- `jpeg|png|gif` - required - these are the only supported images currently
- `@2x` - optional - indicates whether to render the image for retina screens or not

## Config

#### File

`config/http.js`

#### Config Properties

| Property Name | Type | Required | Description
| --- | --- | --- | --- | ---
| port | integer | Yes | Indicates which port to bind when running your HTTP service. (Default: 3000)
| view | object |  | Contains details for loading and rendering Views
| view.layout | string |  | Contains the name of the layout to use from the `views/layout/` directory.
| view.data(ctx) | function |  | A hook called every time a view or layout is rendered. The `ctx` argument indicates the currently executing request `Context`. This function should return an object of properties that will be passed in to the view file at render time.
| session | object |  | Contains the details for managing Web Sessions. This option requires [sand-session](https://github.com/SandJS/session) to be included and loaded on the application. Config options are based on [express-session](https://www.npmjs.com/package/express-session). See `express-session` for config details.
| ai | object |  | Indicates whether to use [_Adaptive Image_](#adaptive-image). This option _requires_ [gm](https://www.npmjs.com/package/gm) module and also requires the [graphics-magick](http://www.graphicsmagick.org/) OS package to be installed. (Default: uses memory store)
| ai.useCache | boolean |  | Indicates whether to cache the individual images generated for each size. (Default: true)
| ai.get(cacheKey, callback(err, buffer)) | function |  | A custom getter function for the cache. Use the cache key to check your cache location, and call the given callback with a buffer of the returned image.
| ai.put(cacheKey, buffer, callback()) | function |  | A custom putter function for the cache. use the cache key to put the buffer into your cache. Invoke the callback when you're done.
| ai.stream(path) | function |  | A custom function for loading a stream of your image file from a remote source (other than the file system). Use path to look up the image on the remote resource and return a stream of the image data.
| beforeAllMiddleware(app) | function |  | A synchronous hook called on application init which passes an instance of the `express` server object. This allows you set custom express middleware `app.use(expressMiddleware)` that will be called with your controller actions. 
| useBodyParser | boolean |  | Indicates whether to load the `bodyParser` config option.
| bodyParser | object |  | Contains options to be passed into [body-parser](https://www.npmjs.com/package/body-parser). See `body-parser` for config details.
| onError(err, ctx) | function |  | A callback that receives any request errors. Arguments include the error and the request `Context` that threw the error. You can use this to do custom error reporting (i.e. send an error summary email to the dev who wrote the broken code, etc.).

## Grain API

#### Global Grain Reference

`sand.http`

#### Properties

| Property Name | Type | Returns | Description
| --- | --- | --- | ---
| [config](#config) | object |  | The reference to the HTTP config. You can attach whatever else you want to the HTTP config and use it with `sand.http.config` anywhere in your project.

## HTTP Context API

TODO