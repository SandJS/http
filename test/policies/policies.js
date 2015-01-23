/**
 * @author Adam Jaso <ajaso@pocketly.com>
 * @copyright 2015 Pocketly
 */ 

module.exports = exports = {

  '/': function public(req, res, next) {
    req.policyName = 'public';
    next();
  }, // a method on the controller
  '/user': function before(req, res, next) {
    req.policyName = 'before';
    next();
  }, // default to the `before`
  '/xyz': function customFunction(req, res, next) {
    req.policyName = 'customFunction';
    next();
  }, // a custom function
  '/skip/*': function skip(req, res, next) {
    req.policyName = 'skip';
    req.skipToAction();
    next();
  },
  '/skip/dummy': function(req, res, next) {
    req.policyName = 'dummy';
    next();
  },

  '/dual': [policy1, policy2]
};

function policy1(req, res, next) {
  req.policy1Name = 'policy1';
  next();
}

function policy2(req, res, next) {
  req.policy2Name = 'policy2';
  next();
}