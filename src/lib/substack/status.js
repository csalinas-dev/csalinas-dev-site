// The durable record of how the sync is doing.
//
// The trigger lives on the read path now (src/lib/substack/refresh.js), where a
// failure has no workflow run to redden and no operator watching. Without a row
// somewhere, "this has been failing for a week" is only knowable while the
// process that saw it is still up — and a crash loop would re-alert on every
// boot. One row, `id: 1`, is the whole feature.
//
// NOTHING IN THIS FILE MAY THROW. It runs inside a background callback that has
// already been handed a degraded sync; an unreachable database must not escalate
// that into a crashed task. Every function catches, logs a CODE (never a Prisma
// `error.message` — P1001's contains the database host and this repo's logs are
// public), and returns null.
import { prisma } from "@/lib/prisma";

// The single row. Always passed explicitly; there is no second one.
const ROW_ID = 1;

const reason = (error) => error?.code ?? error?.name ?? "unknown";

const warn = (what, error) => {
  console.error(`[substack] status ${what} failed (${reason(error)})`);

  return null;
};

/**
 * Fold a sync report into the status row.
 *
 * Item-scope errors are deliberately invisible here: `report.ok` is false only
 * for a feed-scope failure (src/lib/substack/README.md, "The report"), and one
 * malformed post is not a broken sync.
 *
 * @returns {Promise<object|null>} the stored row, or null if the write failed.
 */
export async function recordSyncOutcome(report) {
  const at = new Date();

  try {
    if (report?.ok) {
      return await prisma.substackSyncStatus.upsert({
        where: { id: ROW_ID },
        create: {
          id: ROW_ID,
          ok: true,
          lastAttemptAt: at,
          lastSuccessAt: at,
          consecutiveFailures: 0,
        },
        update: {
          ok: true,
          lastAttemptAt: at,
          lastSuccessAt: at,
          consecutiveFailures: 0,
          firstFailureAt: null,
          lastReason: null,
        },
      });
    }

    // Already capped and stripped by `reportable()` upstream, so it is safe to
    // store and later paste into a public issue body.
    const lastReason = report?.errors?.find((e) => e.scope === "feed")?.message ?? null;

    const existing = await prisma.substackSyncStatus.findUnique({ where: { id: ROW_ID } });

    return await prisma.substackSyncStatus.upsert({
      where: { id: ROW_ID },
      create: {
        id: ROW_ID,
        ok: false,
        lastAttemptAt: at,
        consecutiveFailures: 1,
        firstFailureAt: at,
        lastReason,
      },
      update: {
        ok: false,
        lastAttemptAt: at,
        consecutiveFailures: { increment: 1 },
        // Only on the way in. `firstFailureAt` is how long this outage has been
        // running, so a second failure must not restart the clock — the alert
        // threshold is written against it.
        ...(existing?.firstFailureAt ? {} : { firstFailureAt: at }),
        lastReason,
      },
    });
  } catch (error) {
    return warn("write", error);
  }
}

/** @returns {Promise<object|null>} */
export async function readSyncStatus() {
  try {
    return await prisma.substackSyncStatus.findUnique({ where: { id: ROW_ID } });
  } catch (error) {
    return warn("read", error);
  }
}

/** Records that an alert has been sent, so the next 24h are quiet. */
export async function markNotified(at) {
  try {
    return await prisma.substackSyncStatus.update({
      where: { id: ROW_ID },
      data: { lastNotifiedAt: at },
    });
  } catch (error) {
    return warn("notify-mark", error);
  }
}

/** Records that the outage is over, so the next one alerts immediately. */
export async function clearNotified() {
  try {
    return await prisma.substackSyncStatus.update({
      where: { id: ROW_ID },
      data: { lastNotifiedAt: null },
    });
  } catch (error) {
    return warn("notify-clear", error);
  }
}
