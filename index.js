const getOwnPropertyDescriptors = require('object.getownpropertydescriptors')

function invalidArgTypeMessage (name, expected, actual) {
  // determiner: 'must be' or 'must not be'
  let determiner
  if (typeof expected === 'string' && expected.startsWith('not ')) {
    determiner = 'must not be'
    expected = expected.replace(/^not /, '')
  } else {
    determiner = 'must be'
  }

  let msg
  if (name.endsWith(' argument')) {
    // For cases like 'first argument'
    msg = `The ${name} ${determiner} of type ${String(expected)}`
  } else {
    const type = name.includes('.') ? 'property' : 'argument'
    msg = `The "${name}" ${type} ${determiner} of type ${String(expected)}`
  }

  // TODO(BridgeAR): Improve the output by showing `null` and similar.
  msg += `. Received type ${typeof actual}`
  return msg
}

function getMessage (key, args) {
  if (key === 'ERR_FALSY_VALUE_REJECTION') return 'Promise was rejected with falsy value'
  if (key === 'ERR_INVALID_ARG_TYPE') return invalidArgTypeMessage(...args)
}

function makeNodeErrorWithCode (Base, key) {
  return class NodeError extends Base {
    constructor (...args) {
      super(getMessage(key, args))
    }

    get name () {
      return `${super.name} [${key}]`
    }

    set name (value) {
      Object.defineProperty(this, 'name', {
        configurable: true,
        enumerable: true,
        value,
        writable: true
      })
    }

    get code () {
      return key
    }

    set code (value) {
      Object.defineProperty(this, 'code', {
        configurable: true,
        enumerable: true,
        value,
        writable: true
      })
    }
  }
}

const ERR_FALSY_VALUE_REJECTION = makeNodeErrorWithCode(Error, 'ERR_FALSY_VALUE_REJECTION')
const ERR_INVALID_ARG_TYPE = makeNodeErrorWithCode(TypeError, 'ERR_INVALID_ARG_TYPE')

function callbackifyOnRejected (reason, cb) {
  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
  // Because `null` is a special error value in callbacks which means "no error
  // occurred", we error-wrap so the callback consumer can distinguish between
  // "the promise rejected with null" or "the promise fulfilled with undefined".
  if (!reason) {
    const newReason = new ERR_FALSY_VALUE_REJECTION()
    newReason.reason = reason
    reason = newReason
    Error.captureStackTrace(reason, callbackifyOnRejected)
  }

  return cb(reason)
}

module.exports = function callbackify (original) {
  if (typeof original !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('original', 'Function', original)
  }
  // We DO NOT return the promise as it gives the user a false sense that
  // the promise is actually somehow related to the callback's execution
  // and that the callback throwing will reject the promise.
  function callbackified (...args) {
    const maybeCb = args.pop()
    if (typeof maybeCb !== 'function') {
      throw new ERR_INVALID_ARG_TYPE('last argument', 'Function', maybeCb)
    }
    const cb = (...args) => {
      Reflect.apply(maybeCb, this, args)
    }
    // In true node style we process the callback on `nextTick` with all the
    // implications (stack, `uncaughtException`, `async_hooks`)
    Reflect.apply(original, this, args).then(
      (ret) => process.nextTick(cb, null, ret),
      (rej) => process.nextTick(callbackifyOnRejected, rej, cb)
    )
  }
  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original))
  Object.defineProperties(callbackified, getOwnPropertyDescriptors(original))
  return callbackified
}
