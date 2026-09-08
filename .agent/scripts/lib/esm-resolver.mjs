// A Node ESM resolve hook that lets bare `node` import this repo's source.
//
// The app's modules use extensionless relative imports (`import { orbit } from
// "./orbit"`) because bundlers resolve them; plain Node does not, and refuses
// with ERR_MODULE_NOT_FOUND. This retries a failed RELATIVE specifier with the
// suffixes a bundler would have tried, and leaves bare specifiers (packages,
// `node:` builtins, the `@/` alias) alone so a missing dependency still fails
// loudly instead of being papered over.
//
// Register it from a script's entry point, then import the module under test
// DYNAMICALLY — static imports are resolved before the module body runs, so a
// top-level `import` in the same file would still miss the hook:
//
//   import { register } from "node:module";
//   register("./lib/esm-resolver.mjs", import.meta.url);
//   const engine = await import("../../src/.../_lib/index.js");
//
// Generic on purpose: the next engine that needs a verification script reuses
// this rather than writing its own.
const SUFFIXES = [".js", ".jsx", "/index.js", "/index.jsx"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith(".")) throw error;

    for (const suffix of SUFFIXES) {
      try {
        return await nextResolve(`${specifier}${suffix}`, context);
      } catch {
        // Try the next shape; the original error is rethrown if none work.
      }
    }

    throw error;
  }
}
