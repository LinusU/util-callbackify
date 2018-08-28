// Used to test that `uncaughtException` is emitted

const callbackify = require('../')

function fn () { return Promise.resolve() }

const cbFn = callbackify(fn)

cbFn((_, __) => {
  throw new Error(__filename)
})
