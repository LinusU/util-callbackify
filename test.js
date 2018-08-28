/* eslint-env mocha */

const assert = require('assert')
const { execFile } = require('child_process')
const path = require('path')

const callbackify = require('./')

const values = [
  'hello world',
  null,
  undefined,
  false,
  0,
  {},
  { key: 'value' },
  Symbol('I am a symbol'),
  function ok () {},
  ['array', 'with', 4, 'values'],
  new Error('boo')
]

const nonFunctions = [
  'foo',
  null,
  undefined,
  false,
  0,
  {},
  Symbol(''),
  []
]

// Test that the resolution value is passed as second argument to callback
for (const value of values) {
  it(`handles promise of ${String(value)}`, (done) => {
    // Test Promise factory
    function promiseFn () {
      return Promise.resolve(value)
    }

    const cbPromiseFn = callbackify(promiseFn)
    cbPromiseFn((err, ret) => {
      assert.ifError(err)
      assert.strictEqual(ret, value)

      done()
    })
  })

  it(`handles thenable of ${String(value)}`, (done) => {
    // Test Thenable
    function thenableFn () {
      return {
        then (onRes, _) { onRes(value) }
      }
    }

    const cbThenableFn = callbackify(thenableFn)
    cbThenableFn((err, ret) => {
      assert.ifError(err)
      assert.strictEqual(ret, value)

      done()
    })
  })

  // Test that rejection reason is passed as first argument to callback
  it(`handles rejection of ${String(value)}`, (done) => {
    // test a Promise factory
    function promiseFn () {
      return Promise.reject(value)
    }

    const cbPromiseFn = callbackify(promiseFn)
    cbPromiseFn((err, ret) => {
      assert.strictEqual(ret, undefined)
      if (err instanceof Error) {
        if ('reason' in err) {
          assert(!value)
          assert.strictEqual(err.code, 'ERR_FALSY_VALUE_REJECTION')
          assert.strictEqual(err.reason, value)
        } else {
          assert.strictEqual(String(value).endsWith(err.message), true)
        }
      } else {
        assert.strictEqual(err, value)
      }

      done()
    })
  })

  // Test Thenable
  it(`handles thenable rejection of ${String(value)}`, (done) => {
    function thenableFn () {
      return {
        then (_, onRej) { onRej(value) }
      }
    }

    const cbThenableFn = callbackify(thenableFn)
    cbThenableFn((err, ret) => {
      assert.strictEqual(ret, undefined)
      if (err instanceof Error) {
        if ('reason' in err) {
          assert(!value)
          assert.strictEqual(err.code, 'ERR_FALSY_VALUE_REJECTION')
          assert.strictEqual(err.reason, value)
        } else {
          assert.strictEqual(String(value).endsWith(err.message), true)
        }
      } else {
        assert.strictEqual(err, value)
      }

      done()
    })
  })

  // Test that arguments passed to callbackified function are passed to original
  it(`passes ${String(value)} as value`, (done) => {
    function promiseFn (arg) {
      assert.strictEqual(arg, value)
      return Promise.resolve(arg)
    }

    const cbPromiseFn = callbackify(promiseFn)
    cbPromiseFn(value, (err, ret) => {
      assert.ifError(err)
      assert.strictEqual(ret, value)

      done()
    })
  })

  // Test that `this` binding is the same for callbackified and original
  it(`keeps "this" binding for ${String(value)}`, (done) => {
    const iAmThis = {
      fn (arg) {
        assert.strictEqual(this, iAmThis)
        return Promise.resolve(arg)
      }
    }

    iAmThis.cbFn = callbackify(iAmThis.fn)
    iAmThis.cbFn(value, function (err, ret) {
      assert.ifError(err)
      assert.strictEqual(ret, value)
      assert.strictEqual(this, iAmThis)

      done()
    })
  })
}

// Test that callback that throws emits an `uncaughtException` event
it('emits an `uncaughtException` event', (done) => {
  const fixture = path.join(__dirname, 'fixtures/1.js')
  execFile(
    process.execPath,
    [fixture],
    (err, stdout, stderr) => {
      assert.strictEqual(err.code, 1)
      assert.strictEqual(Object.getPrototypeOf(err).name, 'Error')
      assert.strictEqual(stdout, '')
      const errLines = stderr.trim().split(/[\r\n]+/)
      const errLine = errLines.find((l) => /^Error/.exec(l))
      assert.strictEqual(errLine, `Error: ${fixture}`)

      done()
    }
  )
})

// Test that handled `uncaughtException` works and passes rejection reason
it('can handle `uncaughtException`', (done) => {
  const fixture = path.join(__dirname, 'fixtures/2.js')
  execFile(
    process.execPath,
    [fixture],
    (err, stdout, stderr) => {
      assert.ifError(err)
      assert.strictEqual(stdout.trim(), `look for this in output: ${fixture}`)
      assert.strictEqual(stderr, '')
      done()
    }
  )
})

// Verify that non-function inputs throw.
for (const value of nonFunctions) {
  it(`throws on ${String(value)}`, () => {
    assert.throws(() => callbackify(value), (err) => {
      assert.ok(err instanceof TypeError)
      assert.strictEqual(err.code, 'ERR_INVALID_ARG_TYPE')
      assert.strictEqual(err.message, `The "original" argument must be of type Function. Received type ${typeof value}`)

      return true
    })
  })

  it(`throws when callback is ${String(value)}`, () => {
    const asyncFn = () => Promise.resolve(42)
    const cbFn = callbackify(asyncFn)
    const args = nonFunctions.slice(0, nonFunctions.indexOf(value) + 1)

    assert.throws(() => cbFn(...args), (err) => {
      assert.ok(err instanceof TypeError)
      assert.strictEqual(err.code, 'ERR_INVALID_ARG_TYPE')
      assert.strictEqual(err.message, `The last argument must be of type Function. Received type ${typeof value}`)

      return true
    })
  })
}
