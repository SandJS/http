"use strict";

/**
 * @author Kevin Smithson <ksmithson@pocketly.com>
 * @copyright 2014 Pocketly
 */


let Context = require('./Context');

/**
 * Base Controller to extend from
 * All actions including `before` must
 * be static methods
 *
 * This class never actually gets instantiated
 *
 * Even though this class extends from Context
 * we never actually get any methods inherited.
 * We use it just for auto complete.  Context does
 * get applied when the actions get called though.
 */
class Controller extends Context {
  static *before() {}
}

module.exports = Controller;