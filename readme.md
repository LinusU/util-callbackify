# `util.callbackify`

A backport of `util.callbackify` for Node.js 6.0 and up.

## Installation

```sh
npm install --save util-callbackify
```

## Usage

```js
const callbackify = require('util-callbackify')

async function fn () {
  return 'Hello, World!'
}

const callbackFunction = callbackify(fn)

fn((err, result) => {
  if (err) throw err

  console.log(result)
  //=> Hello, World!
})
```

## API

### `callbackify(original)`

- `original` &lt;Function&gt; An `async` function
- Returns: &lt;Function&gt; a callback style function

Takes an `async` function (or a function that returns a `Promise`) and returns a
function following the error-first callback style, i.e. taking
an `(err, value) => ...` callback as the last argument. In the callback, the
first argument will be the rejection reason (or `null` if the `Promise`
resolved), and the second argument will be the resolved value.

The callback is executed asynchronously, and will have a limited stack trace.
If the callback throws, the process will emit an [`'uncaughtException'`][]
event, and if not handled will exit.

Since `null` has a special meaning as the first argument to a callback, if a
wrapped function rejects a `Promise` with a falsy value as a reason, the value
is wrapped in an `Error` with the original value stored in a field named
`reason`.

```js
function fn() {
  return Promise.reject(null)
}
const callbackFunction = util.callbackify(fn)

callbackFunction((err, ret) => {
  // When the Promise was rejected with `null` it is wrapped with an Error and
  // the original value is stored in `reason`.
  err && err.hasOwnProperty('reason') && err.reason === null // true
})
```

[`'uncaughtException'`]: https://nodejs.org/api/process.html#process_event_uncaughtexception
