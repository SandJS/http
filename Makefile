SRC = lib/*.js

TESTS = test/application

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--require should \
		$(TESTS) \
		--bail

.PHONY: test