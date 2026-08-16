// The idempotent sync. Read the feed, decide per post, write only what changed.
//
// Callable with no HTTP request and no framework around it (#151 section 5;
// #154 wires the trigger). It must NEVER be called from a page render — a blog
// page that syncs is a blog page that fails when Substack is down, which is the
// exact thing #151 section 9 forbids.
//
// Two injected seams, `readFeed` and `store`, are the whole abstraction budget.
// They exist so the pipeline can be exercised end to end with no network and no
// database (.agent/scripts/verify-substack-sync.mjs), which is also what makes
// "running it twice writes nothing" provable instead of merely asserted.
//
// Rejected: one `prisma.upsert` per item. `upsert` ALWAYS writes, so "unchanged
// posts are left alone" becomes untestable, and its update branch would happily
// rewrite the slug. Read the three columns needed for the diff in one query and
// decide.

// Relative, NOT `@/content/posts/slugs`: the alias is a bundler feature and
// this file has to stay loadable by plain `node` for
// .agent/scripts/verify-substack-sync.mjs. slugs.js has no imports of its own
// precisely so it can be reached from here.
import { MDX_SLUGS } from "../../content/posts/slugs";

import { getFeedUrl } from "./config";
import { fetchFeedXml, parseFeedXml } from "./feed";
import { normalizeItem } from "./normalize";

// Give up rather than pile up `-21`, `-22`… A base slug that has collided twenty
// times is a bug to look at, not a number to keep incrementing.
const MAX_SLUG_ATTEMPTS = 20;

// The columns an update is allowed to touch.
//
// `slug` IS NOT HERE AND MUST NOT BE ADDED. It is assigned once at insert and
// never rewritten: that is the answer to "Substack changed the title after we
// assigned a slug" — the title updates, the URL and every inbound link to it
// survive. The tempting `update: { ...post }` would rewrite it and nothing would
// fail loudly, so the patch is BUILT from this list rather than filtered down to
// it, and `updatePatch` refuses to return a patch containing a slug.
const MUTABLE_FIELDS = [
  "title",
  "description",
  "contentHtml",
  "coverImage",
  "author",
  "sourceUrl",
  "publishedAt",
  "contentHash",
];

const updatePatch = (post) => {
  const patch = {};

  for (const field of MUTABLE_FIELDS) patch[field] = post[field];

  if ("slug" in patch) {
    throw new Error("slug must never appear in an update patch — it is frozen at insert.");
  }

  return patch;
};

// #151 section 9: log enough to diagnose a failure without logging article
// content. Every message that reaches the report passes through here, so a
// third-party string can never arrive at an operator's screen unbounded.
const reportable = (message) => String(message ?? "").replace(/\s+/g, " ").trim().slice(0, 200);

// Prisma reports a unique-constraint violation as P2002 with the offending
// field(s) in `meta.target`, which MySQL may give as the index name
// (`SubstackPost_slug_key`) rather than the bare column.
const conflictField = (error) => {
  if (error?.code !== "P2002") return null;

  const target = String(error?.meta?.target ?? "");

  if (target.includes("slug")) return "slug";
  if (target.includes("sourceId")) return "sourceId";

  return null;
};

const candidateSlug = (base, attempt) => (attempt === 1 ? base : `${base}-${attempt}`);

// AN MDX POST ALWAYS OWNS ITS SLUG (CLAUDE.md, src/lib/blog/README.md). A
// reserved candidate is skipped exactly as a taken one is, so a Substack post
// whose title reduces to an MDX slug is stored as `<slug>-2` and the MDX URL is
// never shadowed at the source. The read layer enforces the same rule from the
// other end, for rows that predate it.
//
// The pre-check is a race and the unique constraint is the truth, so this is
// paired with a P2002 retry at the call site rather than trusted on its own.
// Reservation needs no such pairing: the list is static.
const freeSlug = async (store, reserved, base, sourceId, from = 1) => {
  for (let attempt = from; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate = candidateSlug(base, attempt);

    if (reserved.has(candidate)) continue;

    const existing = await store.findBySlug(candidate);

    if (!existing || existing.sourceId === sourceId) return { slug: candidate, attempt };
  }

  return null;
};

export async function syncSubstackPosts({
  feedUrl = getFeedUrl(),
  readFeed = () => fetchFeedXml(feedUrl),
  // Resolved lazily so importing this module never constructs a PrismaClient,
  // and so a caller that injects a store needs no database at all. A static
  // import would also make the no-database verify script impossible: `@/lib/…`
  // is a bundler alias plain Node cannot resolve.
  store = null,
  // The slugs a synced post may never be given. Defaults to the MDX registry's
  // reserved list; an option only so the verify script can probe the rule with
  // a name of its own choosing.
  reservedSlugs = MDX_SLUGS,
  now = () => new Date(),
} = {}) {
  const startedAt = now();

  const report = {
    ok: true,
    feedUrl,
    startedAt,
    finishedAt: startedAt,
    durationMs: 0,
    itemsSeen: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    posts: [],
    errors: [],
  };

  const finish = () => {
    report.finishedAt = now();
    report.durationMs = report.finishedAt.getTime() - report.startedAt.getTime();

    return report;
  };

  const skip = (sourceId, reason) => {
    report.skipped += 1;
    report.posts.push({ sourceId, slug: null, action: "skipped", reason, embedsRemoved: 0, imagesDropped: 0 });
    report.errors.push({ scope: "item", sourceId, message: reason });
  };

  let items;

  try {
    items = parseFeedXml(await readFeed()).items;
  } catch (error) {
    // ZERO writes. A failed feed must never remove or invalidate what is already
    // stored — the blog keeps serving the last good sync (#151 section 9).
    report.ok = false;
    report.errors.push({ scope: "feed", message: reportable(error.message) });

    return finish();
  }

  report.itemsSeen = items.length;

  const posts = [];
  const seen = new Set();

  for (const item of items) {
    const result = normalizeItem(item);

    if (!result.ok) {
      skip(null, result.reason);
      continue;
    }

    if (seen.has(result.post.sourceId)) {
      skip(result.post.sourceId, "duplicate sourceId in feed");
      continue;
    }

    seen.add(result.post.sourceId);
    posts.push(result);
  }

  const activeStore = store ?? (await import("./store")).prismaStore;

  let existing;

  try {
    existing = await activeStore.findBySourceIds([...seen]);
  } catch (error) {
    report.ok = false;
    report.errors.push({ scope: "feed", message: `lookup failed (${reportable(error.code ?? error.name)})` });

    return finish();
  }

  const bySourceId = new Map(existing.map((row) => [row.sourceId, row]));
  const reserved = new Set(reservedSlugs);

  for (const { post, embedsRemoved, imagesDropped } of posts) {
    try {
      const { action, slug } = await applyPost(activeStore, reserved, post, bySourceId.get(post.sourceId));

      report[action] += 1;
      report.posts.push({ sourceId: post.sourceId, slug, action, embedsRemoved, imagesDropped });
    } catch (error) {
      skip(post.sourceId, storeReason(error));
    }
  }

  return finish();
}

// The whole per-item decision, in one place: insert what is new, update what
// changed, and touch nothing else.
async function applyPost(store, reserved, post, row, mayRetry = true) {
  if (!row) {
    // Bounded on purpose: one re-read after losing the race. A second loss means
    // something stranger than concurrency is happening and it should surface as
    // a skipped item, not as a spin.
    if (!mayRetry) throw tagged("sourceId conflicted but the row could not be read back");

    const inserted = await insert(store, reserved, post);

    // A concurrent sync claimed this sourceId between our read and our write.
    // Re-read and fall through to the "already present" logic rather than
    // reporting a failure — the post is in, it is just not us who put it there.
    if (!inserted.raced) return { action: "created", slug: inserted.slug };

    const [fresh] = await store.findBySourceIds([post.sourceId]);

    return applyPost(store, reserved, post, fresh ?? null, false);
  }

  // Hash equal: do nothing at all, not even a syncedAt touch. That is the whole
  // point of hashing AFTER sanitization — the stored row is already identical to
  // what we would write.
  if (row.contentHash === post.contentHash) return { action: "unchanged", slug: row.slug };

  // Note what is missing: `slug`. The row keeps the slug it was inserted with
  // even though the title above it may have changed.
  await store.update(post.sourceId, updatePatch(post));

  return { action: "updated", slug: row.slug };
}

// Assigns the slug — the one place in the codebase it is ever chosen — and
// creates the row.
async function insert(store, reserved, post) {
  let free = await freeSlug(store, reserved, post.slug, post.sourceId);

  while (free) {
    try {
      await store.create({ ...updatePatch(post), sourceId: post.sourceId, slug: free.slug });

      return { slug: free.slug, raced: false };
    } catch (error) {
      const field = conflictField(error);

      if (field === "sourceId") return { raced: true };

      // Somebody took the slug between the pre-check and the write; the
      // pre-check is a race and the constraint is the truth. Resume the search
      // after the candidate that lost.
      if (field !== "slug") throw error;

      free = await freeSlug(store, reserved, post.slug, post.sourceId, free.attempt + 1);
    }
  }

  throw tagged(`no free slug after ${MAX_SLUG_ATTEMPTS} attempts`);
}

// An error this module raised itself, whose message is therefore known to be
// safe to report verbatim.
const tagged = (message) => Object.assign(new Error(message), { reportableReason: message });

// Never the store's own `error.message`: only a code. A driver is free to echo
// back the values it was handed, and one of those values is the article body.
const storeReason = (error) =>
  reportable(error?.reportableReason ?? `write failed (${error?.code ?? error?.name ?? "unknown"})`);
