// The only module in the repo that knows what RSS looks like.
//
// `content:encoded`, `dc:creator`, `enclosure`, `pubDate`, `guid` and the `@_`
// attribute prefix appear HERE and nowhere else — that is #151 section 1's
// requirement, and it is what lets the feed shape change without touching
// normalize/sync. Everything downstream receives the flat `RawItem` shape at the
// bottom of this file, in which every field is a string or null.

import { XMLParser } from "fast-xml-parser";

const USER_AGENT = "csalinas.dev-substack-sync (+https://csalinas.dev)";

// The largest real Substack feed measured while planning this was 772 KB; 10 MB
// is generous headroom that still refuses to buffer a hostile response forever.
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15000;

// `parseTagValue: false` is load-bearing, not tidiness: without it a post
// titled "2026" (or a numeric guid) is handed back as a JS Number and the first
// `.trim()` downstream throws, far from here. `processEntities` decodes the XML
// entities that wrap CDATA-less fields; `htmlEntities: false` leaves HTML
// entities inside `content:encoded` for the sanitizer to deal with.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: false,
});

// `channel.item` is an array ONLY when the feed has more than one item; a
// publication with a single post yields a bare object, and one with none yields
// undefined. The publication this site syncs currently has zero posts, so the
// first real run will take the single-item path.
const asArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

// A tag carrying attributes comes back as `{ "#text": "…", "@_isPermaLink": … }`
// and the same tag without them comes back as a plain string. Both shapes occur
// for `<guid>` in real feeds.
const text = (value) => {
  if (value == null) return null;

  const raw = typeof value === "object" ? value["#text"] : value;

  if (raw == null) return null;

  const trimmed = String(raw).trim();

  return trimmed === "" ? null : trimmed;
};

const attr = (value, name) => (value && typeof value === "object" ? text(value[name]) : null);

// Fetches the feed body as text. Never cached: `cache: "no-store"` keeps this
// out of Next's fetch cache, because a sync that reads a stale feed silently
// reports "unchanged" for posts that have in fact changed.
export async function fetchFeedXml(url, { timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8", "user-agent": USER_AGENT },
  });

  // Status only. The body of a failed response is third-party content and has
  // no place in a log line (#151 section 9).
  if (!response.ok) {
    throw new Error(`Feed request failed with HTTP ${response.status}.`);
  }

  const xml = await response.text();

  if (xml.length > maxBytes) {
    throw new Error(`Feed body is larger than the ${maxBytes} byte limit.`);
  }

  return xml;
}

// Parses feed XML into `{ items: RawItem[] }`, where a RawItem is
// `{ id, link, title, description, creator, published, mediaUrl, mediaType,
//    contentEncoded }` and every value is a string or null.
//
// This is the boundary: normalize.js sees only that shape. The field names are
// deliberately NOT the RSS ones — `id` is the <guid>, `published` is <pubDate>,
// `mediaUrl`/`mediaType` are the <enclosure> attributes — so that grepping the
// repo for an RSS name finds this file and only this file.
export function parseFeedXml(xml) {
  if (typeof xml !== "string" || !xml.trim()) {
    throw new Error("Feed body is empty.");
  }

  let parsed;

  try {
    parsed = parser.parse(xml);
  } catch (error) {
    throw new Error(`Feed XML could not be parsed: ${error.message}`);
  }

  const channel = parsed?.rss?.channel;

  if (!channel) {
    throw new Error("Feed XML has no rss > channel element.");
  }

  const items = asArray(channel.item).map((item) => {
    // A second <enclosure> has never been seen on a Substack item, but RSS
    // permits one and the parser would hand back an array; take the first.
    const enclosure = asArray(item?.enclosure)[0];

    return {
      id: text(item?.guid),
      link: text(item?.link),
      title: text(item?.title),
      description: text(item?.description),
      creator: text(item?.["dc:creator"]),
      published: text(item?.pubDate),
      mediaUrl: attr(enclosure, "@_url"),
      mediaType: attr(enclosure, "@_type"),
      contentEncoded: text(item?.["content:encoded"]),
    };
  });

  return { items };
}
