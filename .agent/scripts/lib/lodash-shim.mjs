// Lodash, re-exported as real ESM named bindings.
//
// The app imports `import { range } from "lodash"` and a bundler resolves it.
// Plain Node cannot: lodash's CommonJS build assigns its exports in a way
// `cjs-module-lexer` does not see through, so Node offers only a default export
// and a static named import fails with
//
//   SyntaxError: The requested module 'lodash' does not provide an export named 'range'
//
// which reads as a missing dependency rather than as an interop problem.
//
// Paired with ./lodash-resolver.mjs, which points the bare `lodash` specifier
// here. Add a name below when a script pulls in a module that needs one — the
// list is only what this repo actually imports, so a typo still fails loudly
// instead of resolving to undefined.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lodash = require("lodash");

export const {
  clamp,
  clone,
  cloneDeep,
  every,
  filter,
  find,
  findIndex,
  flatten,
  map,
  random,
  range,
  reduce,
  slice,
  sortBy,
  take,
} = lodash;

export default lodash;
