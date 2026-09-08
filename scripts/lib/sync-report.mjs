// Turning a sync report into an exit code and a job summary.
//
// NO IMPORTS AT ALL, not even node builtins: it takes a report and returns a
// string, so `.agent/scripts/verify-substack-refresh.mjs` can exercise every
// branch offline with hand-built reports.
//
// The output lands in two public places — a GitHub job summary and the body of
// an alert issue — and every value in it originated at a third party. Hence
// `cell()`, applied without exception.

// Above this a table stops being readable and starts being a wall.
const MAX_ROWS = 60;

/**
 * The exit code the deploy step keys on.
 *
 * The 1/2 split is the whole point and must not be collapsed:
 * `report.ok` is false ONLY for a feed-scope failure (the feed could not be read
 * or parsed and nothing was written) — THE SYNC IS BROKEN. Item-scope errors
 * leave `ok` true — ONE POST IS BROKEN, which is not the same thing and must
 * never fail a deploy.
 *
 * @returns {0|1|2} 0 clean, 1 feed-scope failure, 2 item-scope errors only.
 */
export function classify(report) {
  if (report?.ok === false) return 1;
  if ((report?.errors?.length ?? 0) > 0) return 2;

  return 0;
}

/**
 * Neutralize one value for a markdown table cell.
 *
 * `|` would add a column, a newline would end the row, and a backtick could open
 * a code fence that swallows the rest of the summary. A Substack title is
 * whatever somebody typed; none of those may survive it.
 */
export function cell(value) {
  return String(value ?? "")
    .replace(/[|`\r\n]/g, " ")
    .trim()
    .slice(0, 200);
}

const table = (headers, rows) => {
  if (rows.length === 0) return [];

  const shown = rows.slice(0, MAX_ROWS);

  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...shown.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ];

  if (rows.length > shown.length) lines.push("", `_…and ${rows.length - shown.length} more_`);

  return lines;
};

const statusLine = (report) => {
  if (report?.ok === false) return "❌ feed unavailable — nothing was written";

  const n = report?.errors?.length ?? 0;

  if (n > 0) return `⚠️ ${n} item${n === 1 ? "" : "s"} skipped`;

  return "✅ clean";
};

const iso = (value) => {
  if (!value) return "unknown";

  const at = value instanceof Date ? value : new Date(value);

  return Number.isNaN(at.getTime()) ? "unknown" : at.toISOString();
};

const totals = (posts, key) => posts.reduce((sum, post) => sum + (post?.[key] ?? 0), 0);

/**
 * The job summary, and the body of the alert issue.
 *
 * @param {object} report
 * @param {object} [options]
 * @param {string} [options.runUrl] the workflow run this came from
 * @param {object} [options.status] the SubstackSyncStatus row — the read path's history
 */
export function summaryMarkdown(report, { runUrl, status } = {}) {
  const posts = report?.posts ?? [];
  const embeds = totals(posts, "embedsRemoved");
  const images = totals(posts, "imagesDropped");

  const lines = [
    // Headline FIRST, so the run page shows the numbers without anybody
    // expanding anything.
    `**Substack sync — ${report?.itemsSeen ?? 0} seen · ${report?.created ?? 0} created · ` +
      `${report?.updated ?? 0} updated · ${report?.unchanged ?? 0} unchanged · ` +
      `${report?.skipped ?? 0} skipped · ${embeds} embeds removed · ${images} images dropped**`,
    "",
    statusLine(report),
    "",
    `- Feed: \`${cell(report?.feedUrl ?? "unset")}\``,
    `- Started: ${iso(report?.startedAt)}`,
    `- Duration: ${report?.durationMs ?? 0} ms`,
  ];

  const changed = posts.filter((post) => post?.action === "created" || post?.action === "updated");

  if (changed.length > 0) {
    lines.push("", "### Changes", "");
    lines.push(...table(["slug", "action"], changed.map((post) => [post.slug, post.action])));
  }

  // The SOLE consumer of embedsRemoved / imagesDropped. Without this section
  // those two counters are computed by the sanitizer and read by nobody — do not
  // drop it.
  const stripped = posts.filter(
    (post) => (post?.embedsRemoved ?? 0) + (post?.imagesDropped ?? 0) > 0
  );

  if (stripped.length > 0) {
    lines.push("", "### Content removed", "");
    lines.push(
      ...table(
        ["slug", "embeds removed", "images dropped"],
        stripped.map((post) => [post.slug ?? post.sourceId, post.embedsRemoved ?? 0, post.imagesDropped ?? 0])
      )
    );
  }

  const errors = report?.errors ?? [];

  if (errors.length > 0) {
    lines.push("", "### Errors", "");
    lines.push(
      ...table(
        ["scope", "sourceId", "message"],
        errors.map((error) => [error.scope, error.sourceId ?? "—", error.message])
      )
    );
  }

  // The bridge that makes a week of quiet read-path failures visible on a
  // deploy: the read path has no workflow run of its own to redden.
  if (status) {
    lines.push(
      "",
      "### Read-path history",
      "",
      `- Last success: ${status.lastSuccessAt ? iso(status.lastSuccessAt) : "never"}`,
      `- Last attempt: ${status.lastAttemptAt ? iso(status.lastAttemptAt) : "never"}`,
      `- Consecutive failures: ${status.consecutiveFailures ?? 0}`,
      `- First failure: ${status.firstFailureAt ? iso(status.firstFailureAt) : "—"}`,
      `- Last reason: ${status.lastReason ? cell(status.lastReason) : "—"}`
    );
  }

  if (runUrl) lines.push("", `Run: ${cell(runUrl)}`);

  return `${lines.join("\n")}\n`;
}
