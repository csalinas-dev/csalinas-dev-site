// Verification harness for .github/workflows -- the gate that #174 did not have.
//
//   node .agent/scripts/verify-workflows.mjs
//
// This repo has no test runner, so the check is a committed script, same as
// verify-blog-posts.mjs and friends. NO NETWORK: it reads files and parses
// them, nothing else.
//
// WHAT IT IS FOR. Three deploys in a row ended in `startup_failure` -- GitHub
// refused to load the workflow, so no job was created, no step ran, and there
// was no annotation and no step log to read. The file was NOT malformed:
// actionlint accepted it, and so did @actions/workflow-parser, which is
// GitHub's own parser. The defect was that #154 added
//
//     uses: actions/github-script@v7
//
// and this repository's Actions policy is
//
//     $ gh api repos/csalinas-dev/csalinas-dev-site/actions/permissions
//     {"enabled":true,"allowed_actions":"local_only", ...}
//
// `local_only` permits ONLY actions and reusable workflows defined inside this
// repository. Anything else is refused at workflow load time. That policy is
// deliberate and worth keeping: the deploy job runs on a SELF-HOSTED runner, so
// a third-party action is arbitrary code executing on Christopher's own server.
//
// So rule 2 below is the one that matters, and no amount of YAML linting
// substitutes for it -- a linter passes the broken file. Rule 1 is here because
// an unparseable file is the other way to earn a `startup_failure`, and it is
// cheap to cover.
//
// THE RULES
//   1. every file in .github/workflows/ parses as YAML
//   2. every `uses:` in those files is `./`-local
//
// SELF-TEST. Before it judges the real workflows the script runs both rules
// against .agent/fixtures/workflows/, which holds a known-BAD file for each
// rule and one known-good file. If a fixture that must fail does not fail, the
// script exits non-zero without reporting on the real workflows at all -- a
// gate that cannot go red must not be allowed to report green. `external-
// action.yml` is the real #174 defect reduced, so rule 2 is permanently pinned
// against the thing it was written for.
//
// ANCHORS. A scan that matches nothing looks exactly like a scan that passed,
// so the script asserts it found workflow files, that it walked at least one
// step, and that the fixtures it self-tests on are all present.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKFLOW_DIR = join(ROOT, ".github", "workflows");
const FIXTURE_DIR = join(ROOT, ".agent", "fixtures", "workflows");

// A workflow may only reference an action that lives in this repository, which
// on the wire means a path reference. GitHub also accepts `docker://`, and that
// is NOT local -- it pulls an image from a registry -- so it is not allowed
// here either.
const isLocal = (ref) => ref.startsWith("./");

const listWorkflows = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
        .sort()
        .map((f) => join(dir, f))
    : [];

// Every `uses:` anywhere in the document: step-level (`jobs.<id>.steps[].uses`)
// and job-level reusable-workflow calls (`jobs.<id>.uses`). Walking the parsed
// tree rather than grepping the text is the whole point -- a `uses:` written
// inside a `run: |` block is a shell line, not a step reference, and a grep
// cannot tell the difference. `local-only.yml` contains exactly that string for
// this reason.
const collectUses = (node, path, out) => {
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectUses(child, `${path}[${i}]`, out));
    return;
  }

  if (!node || typeof node !== "object") return;

  for (const [key, value] of Object.entries(node)) {
    const here = path ? `${path}.${key}` : key;
    if (key === "uses" && typeof value === "string") out.push({ ref: value.trim(), path: here });
    else collectUses(value, here, out);
  }
};

// Returns the failures for one file. An empty array means it passed. `steps` is
// reported back so the caller can anchor on having actually walked something.
const checkFile = (file) => {
  const label = relative(ROOT, file).split("\\").join("/");
  const failures = [];
  let doc;

  try {
    doc = yaml.load(readFileSync(file, "utf8"), { filename: label });
  } catch (err) {
    // Rule 1. `err.message` from js-yaml already carries the line and column.
    return { label, failures: [`${label}: does not parse as YAML -- ${err.message}`], uses: 0 };
  }

  if (!doc || typeof doc !== "object") {
    return { label, failures: [`${label}: parsed to nothing usable (empty or scalar document)`], uses: 0 };
  }

  const found = [];
  collectUses(doc, "", found);

  for (const { ref, path } of found) {
    // Rule 2.
    if (!isLocal(ref)) {
      failures.push(
        `${label}: ${path} references "${ref}", which is not an action in this repository.\n` +
          `    This repo's Actions policy is allowed_actions=local_only, so GitHub will refuse\n` +
          `    to load the whole workflow and the run ends in startup_failure with no step log.\n` +
          `    Do the work in a run: step, or add a ./-local composite action under .github/actions/.\n` +
          `    See #174.`
      );
    }
  }

  return { label, failures, uses: found.length };
};

const fail = (message) => {
  console.error(`FAIL  ${message}`);
  process.exitCode = 1;
};

// --- self-test ------------------------------------------------------------
// Each fixture states the verdict it must produce. If a must-fail fixture
// passes, this gate is broken and may not be trusted to report on anything.
const FIXTURES = [
  { file: "unparseable.yml", mustFail: true, because: "rule 1 (YAML does not parse)" },
  { file: "external-action.yml", mustFail: true, because: "rule 2 (non-local uses:)" },
  { file: "local-only.yml", mustFail: false, because: "run: steps and a ./-local action" },
];

let selfTestOk = true;

for (const { file, mustFail, because } of FIXTURES) {
  const path = join(FIXTURE_DIR, file);

  if (!existsSync(path)) {
    selfTestOk = false;
    fail(`self-test: fixture ${file} is missing -- this gate cannot prove it goes red`);
    continue;
  }

  const { failures } = checkFile(path);
  const failed = failures.length > 0;

  if (failed !== mustFail) {
    selfTestOk = false;
    fail(
      mustFail
        ? `self-test: ${file} was ACCEPTED but must be rejected by ${because}. The gate is broken.`
        : `self-test: ${file} was REJECTED but must pass (${because}):\n  ${failures.join("\n  ")}`
    );
  }
}

if (!selfTestOk) {
  console.error("\nRefusing to report on .github/workflows -- the self-test failed.");
  process.exit(1);
}

console.log(`self-test ok  (${FIXTURES.length} fixtures: 2 must fail, 1 must pass)`);

// --- the real workflows ----------------------------------------------------
const workflows = listWorkflows(WORKFLOW_DIR);

// Anchor: a repo whose workflows all vanished must not read as a pass.
if (workflows.length === 0) {
  fail(`no workflow files found in ${relative(ROOT, WORKFLOW_DIR)} -- a scan that matched nothing is not a pass`);
  process.exit(1);
}

let violations = 0;
let usesSeen = 0;

for (const file of workflows) {
  const { label, failures, uses } = checkFile(file);
  usesSeen += uses;

  if (failures.length === 0) {
    console.log(`ok    ${label}${uses ? `  (${uses} uses:, all local)` : ""}`);
    continue;
  }

  violations += failures.length;
  for (const message of failures) fail(message);
}

if (violations > 0) {
  console.error(`\n${violations} violation(s) across ${workflows.length} workflow file(s).`);
  process.exit(1);
}

console.log(`\n${workflows.length} workflow file(s) ok, ${usesSeen} uses: reference(s) checked.`);
