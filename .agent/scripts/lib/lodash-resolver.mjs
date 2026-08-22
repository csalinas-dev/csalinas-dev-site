// A Node ESM resolve hook that points `lodash` at ./lodash-shim.mjs.
//
// DELIBERATELY SEPARATE from ./esm-resolver.mjs and ./alias-resolver.mjs, for
// the same reason those two are separate from each other: a script should opt
// in to exactly the interop it needs, so a script that proves it touches no
// database (or no third-party module) keeps proving it.
//
// Register it whenever a script loads application modules that reach a game
// engine — `src/lib/realtime/registry.js` pulls in all four game definitions,
// and Tic-Tac-Overflow's board helpers import `range` from lodash:
//
//   register("./lib/esm-resolver.mjs", import.meta.url);
//   register("./lib/alias-resolver.mjs", import.meta.url);
//   register("./lib/lodash-resolver.mjs", import.meta.url);
//
// See lodash-shim.mjs for why a bare named import fails under plain Node.
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SHIM = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), "lodash-shim.mjs")
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "lodash") return { url: SHIM, shortCircuit: true };
  return nextResolve(specifier, context);
}
