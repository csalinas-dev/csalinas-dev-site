// A Node ESM resolve hook for the repo's `@/` alias (jsconfig.json: `@/` → src/).
//
// DELIBERATELY SEPARATE FROM ./esm-resolver.mjs, which leaves `@/` alone on
// purpose. The scripts that must prove they touch no database — chiefly
// verify-substack-sync.mjs and verify-blog-posts.mjs — get that guarantee partly
// from the fact that `@/lib/prisma` simply cannot be loaded under plain `node`.
// Teaching the shared hook to resolve the alias would quietly remove it.
//
// So this one is registered only by a script that genuinely wants the real
// application modules, database and all — today that is
// seed-substack-fixture.mjs.
//
//   register("./lib/esm-resolver.mjs", import.meta.url);
//   register("./lib/alias-resolver.mjs", import.meta.url);
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

// The same shapes a bundler would try for an extensionless specifier.
const SUFFIXES = ["", ".js", ".jsx", "/index.js", "/index.jsx"];

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

  const base = join(SRC, specifier.slice(2));

  for (const suffix of SUFFIXES) {
    const candidate = `${base}${suffix}`;

    if (existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }

  throw new Error(`alias-resolver: cannot resolve "${specifier}" under ${SRC}`);
}
