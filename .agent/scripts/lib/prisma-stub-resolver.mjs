// A Node ESM resolve hook that points `@/lib/prisma` at ./prisma-stub.mjs.
//
// Register it AFTER ./alias-resolver.mjs — Node runs the most recently
// registered resolve hook first, and the alias hook would otherwise resolve
// `@/lib/prisma` to the real PrismaClient, which needs a database.
//
//   register("./lib/alias-resolver.mjs", import.meta.url);
//   register("./lib/prisma-stub-resolver.mjs", import.meta.url);
//
// It is deliberately exact-match: a script that wants the real client simply
// does not register this hook, and no other specifier is affected.
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const STUB = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), "prisma-stub.mjs")
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier !== "@/lib/prisma") return nextResolve(specifier, context);
  return nextResolve(STUB, context);
}
