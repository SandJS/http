TESTS = test/*.test.js

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--harmony \
		--require should \
		$(TESTS) \
		--bail

.PHONY: test