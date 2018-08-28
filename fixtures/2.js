// Used to test the `uncaughtException` err object

const assert = require('assert')
const callbackify = require('../')

const sentinel = new Error(__filename)
process.once('uncaughtException', (err) => {
  assert.notStrictEqual(err, sentinel)
  // Calling test will use `stdout` to assert value of `err.message`
  console.log(err.message)
})

function fn () {
  return Promise.reject(sentinel)
}

const cbFn = callbackify(fn)
cbFn((err, ret) => { throw new Error(`look for this in output: ${err.message}`) })
