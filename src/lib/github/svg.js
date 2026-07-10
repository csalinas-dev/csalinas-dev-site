import { palette, fontFamily } from "./palette";
import { sonoFontFace } from "./font";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtNum = (n) => n.toLocaleString("en-US");

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function fmtRange(start, end, { openEnded = false } = {}) {
  if (!start) return "—";
  if (openEnded) return `${fmtDate(start)} – Present`;
  if (start === end) return fmtDate(start);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

const esc = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

const label = (x, y, text, { size = 12, fill = palette.muted, anchor = "middle", weight = 400 } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`;

// ---------------------------------------------------------------------------
// Editor-window chrome. Windows-style: filename left, min/max/close right.
// ---------------------------------------------------------------------------
const BAR = 36;
const W = 760;

function windowControls(width) {
  const cy = BAR / 2;
  const close = width - 20;
  const max = width - 46;
  const min = width - 72;
  const s = 4.5;
  const stroke = `stroke="${palette.muted}" stroke-width="1.4" stroke-linecap="round"`;
  return `
    <line x1="${min - s}" y1="${cy}" x2="${min + s}" y2="${cy}" ${stroke} />
    <rect x="${max - s}" y="${cy - s}" width="${s * 2}" height="${s * 2}" rx="1" fill="none" ${stroke} />
    <line x1="${close - s}" y1="${cy - s}" x2="${close + s}" y2="${cy + s}" ${stroke} />
    <line x1="${close - s}" y1="${cy + s}" x2="${close + s}" y2="${cy - s}" ${stroke} />`;
}

function windowFrame({ width, height, filename, body }) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
     xmlns="http://www.w3.org/2000/svg" role="img" font-family="${fontFamily}">
  <style>
    ${sonoFontFace()}
    /* Base state is visible; the animation only fades in. Renderers that
       don't run CSS animations still show the content at full opacity. */
    .fade { animation: fadeIn 0.8s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    text { font-family: ${fontFamily}; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10"
        fill="${palette.background}" stroke="${palette.border}" />
  <text x="16" y="${BAR / 2 + 4}" font-size="12" fill="${palette.muted}">${esc(filename)}</text>
  ${windowControls(width)}
  <line x1="0" y1="${BAR}" x2="${width}" y2="${BAR}" stroke="${palette.border}" />
  <g class="fade">${body}</g>
</svg>`;
}

// A divider + "// comment" section header. Returns { content, nextTop }.
function sectionHeader(yTop, text) {
  const content =
    `<line x1="0" y1="${yTop}" x2="${W}" y2="${yTop}" stroke="${palette.border}" />` +
    `<text x="26" y="${yTop + 24}" font-size="13" fill="${palette.comment}">${esc(text)}</text>`;
  return { content, nextTop: yTop + 38 };
}

// ---------------------------------------------------------------------------
// Section: hero (name + syntax-highlighted TypeScript profile object)
// ---------------------------------------------------------------------------
function heroSection(yTop) {
  const x = 26;
  const c = {
    kw: palette.const,
    name: palette.var,
    type: palette.type,
    str: palette.string,
    punct: palette.foreground,
    brace: palette.parenthesis,
  };

  const line = (y, tokens) =>
    `<text x="${x}" y="${y}" font-size="14" xml:space="preserve">` +
    tokens.map((t) => `<tspan fill="${t.c}">${esc(t.t)}</tspan>`).join("") +
    `</text>`;

  const arr = (items) => [
    { t: "[", c: c.brace },
    ...items.flatMap((it, i) => [
      { t: `"${it}"`, c: c.str },
      { t: i < items.length - 1 ? ", " : "", c: c.punct },
    ]),
    { t: "]", c: c.brace },
    { t: ",", c: c.punct },
  ];
  const kv = (key, value) => [{ t: `  ${key}`, c: c.name }, ...value];
  const str = (s) => [{ t: `"${s}"`, c: c.str }, { t: ",", c: c.punct }];

  const codeY0 = yTop + 114;
  const step = 26;
  const rows = [
    [{ t: "const ", c: c.kw }, { t: "chris", c: c.name }, { t: ": ", c: c.punct }, { t: "SoftwareEngineer", c: c.type }, { t: " = ", c: c.punct }, { t: "{", c: c.brace }],
    kv("location:  ", str("Albuquerque, NM")),
    kv("role:      ", str("Senior Software Engineer @ Netsurit (formerly iTEAM Consulting)")),
    kv("education: ", str("B.S. Computer Science, University of New Mexico")),
    kv("stack:     ", arr(["TypeScript", "React", "Next.js", "C#", ".NET", "GraphQL", "SQL", "Azure"])),
    kv("website:   ", str("https://csalinas.dev")),
    kv("hobbies:   ", arr(["📷 photography", "⛳ golf", "🎮 building games"])),
    [{ t: "}", c: c.brace }, { t: ";", c: c.punct }],
  ];

  const header =
    `<text x="${x}" y="${yTop + 38}" font-size="30" font-weight="700" fill="${palette.foreground}">Christopher Salinas Jr.</text>` +
    `<text x="${x}" y="${yTop + 68}" font-size="14" fill="${palette.comment}">// Senior Software Engineer · Albuquerque, NM · building for the web since 2014</text>`;
  const code = rows.map((tokens, i) => line(codeY0 + i * step, tokens)).join("");

  return { content: header + code, bottom: codeY0 + (rows.length - 1) * step + 16 };
}

// ---------------------------------------------------------------------------
// Section: streak (Total Contributions | Current Streak | Longest Streak)
// ---------------------------------------------------------------------------
function streakSection(s, yTop) {
  const cols = [W / 6, W / 2, (W * 5) / 6];
  const yNum = yTop + 64;
  const yLabel = yTop + 100;
  const yDate = yTop + 126;

  const divider = (x) =>
    `<line x1="${x}" y1="${yTop + 4}" x2="${x}" y2="${yDate + 12}" stroke="${palette.border}" />`;

  const col = (cx, value, name, range, big = true) =>
    [
      big ? label(cx, yNum, value, { size: 30, fill: palette.foreground, weight: 700 }) : "",
      label(cx, yLabel, name, { size: 11.5, fill: name === "Current Streak" ? palette.const : palette.muted, weight: name === "Current Streak" ? 700 : 400 }),
      label(cx, yDate, range, { size: 10.5, fill: palette.comment }),
    ].join("");

  const left = col(cols[0], fmtNum(s.total), "Total Contributions", fmtRange(s.firstContribution, null, { openEnded: true }));
  const right = col(cols[2], fmtNum(s.longest.length), "Longest Streak", fmtRange(s.longest.start, s.longest.end));

  // Center: current streak inside a ring.
  const cx = cols[1];
  const ringCy = yTop + 50;
  const r = 32;
  const circ = 2 * Math.PI * r;
  const ring =
    `<circle cx="${cx}" cy="${ringCy}" r="${r}" fill="none" stroke="${palette.border}" stroke-width="6" />` +
    `<circle cx="${cx}" cy="${ringCy}" r="${r}" fill="none" stroke="${palette.const}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${(circ * 0.28).toFixed(1)}" transform="rotate(-90 ${cx} ${ringCy})" />`;
  const center =
    ring +
    label(cx, ringCy - r - 4, "🔥", { size: 18 }) +
    label(cx, ringCy + 8, fmtNum(s.current.length), { size: 22, fill: palette.foreground, weight: 700 }) +
    col(cx, "", "Current Streak", s.current.length ? fmtRange(s.current.start, s.current.end) : "—", false);

  const content = divider(W / 3) + divider((W * 2) / 3) + left + center + right;
  return { content, bottom: yDate + 18 };
}

// ---------------------------------------------------------------------------
// Section: stats list (left) + languages bar (right), side by side
// ---------------------------------------------------------------------------
function statsLangSection(o, yTop) {
  // --- stats (left half) ---
  const rows = [
    { icon: "★", color: palette.parenthesis, label: "Total Stars Earned", value: o.stars },
    { icon: "⚇", color: palette.type, label: "Total Commits (incl. private)", value: o.commits },
    { icon: "⇆", color: palette.module, label: "Total PRs", value: o.pullRequests },
    { icon: "⚠", color: palette.selector, label: "Total Issues", value: o.issues },
    { icon: "◎", color: palette.component, label: "Public Repos", value: o.repos },
    { icon: "♡", color: palette.regex, label: "Followers", value: o.followers },
  ];
  const rowY0 = yTop + 16;
  const step = 22;
  const valX = W / 2 - 30;
  const stats = rows
    .map((r, i) => {
      const y = rowY0 + i * step;
      return (
        `<text x="26" y="${y}" font-size="14" fill="${r.color}">${esc(r.icon)}</text>` +
        `<text x="48" y="${y}" font-size="13" fill="${palette.foreground}">${esc(r.label)}</text>` +
        `<text x="${valX}" y="${y}" text-anchor="end" font-size="13.5" font-weight="700" fill="${palette.numeric}">${esc(fmtNum(r.value))}</text>`
      );
    })
    .join("");
  const statsBottom = rowY0 + (rows.length - 1) * step;

  // --- languages (right half) ---
  const langs = o.languages.slice(0, 6);
  const shown = langs.reduce((s, l) => s + l.percent, 0) || 1;
  const norm = langs.map((l) => ({ ...l, pct: (l.percent / shown) * 100 }));
  const barX = W / 2 + 6;
  const barW = W - 26 - barX;
  const barY = yTop + 10;
  const barH = 12;

  let cursor = barX;
  const segments = norm
    .map((l, i) => {
      const w = (l.pct / 100) * barW;
      const clip = i === 0 ? `<clipPath id="lc"><rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="6"/></clipPath>` : "";
      const seg = `<rect x="${cursor.toFixed(2)}" y="${barY}" width="${(w + 0.6).toFixed(2)}" height="${barH}" fill="${l.color || palette.muted}" clip-path="url(#lc)" />`;
      cursor += w;
      return clip + seg;
    })
    .join("");

  const legStartY = yTop + 44;
  const legStep = 22;
  const colW = barW / 2;
  const legend = norm
    .map((l, i) => {
      const x = barX + (i % 2) * colW;
      const y = legStartY + Math.floor(i / 2) * legStep;
      return (
        `<circle cx="${x + 6}" cy="${y - 4}" r="5" fill="${l.color || palette.muted}" />` +
        `<text x="${x + 18}" y="${y}" font-size="12" fill="${palette.foreground}">${esc(l.name)}</text>` +
        `<text x="${x + 24 + l.name.length * 7.3}" y="${y}" font-size="11" fill="${palette.muted}">${l.percent.toFixed(1)}%</text>`
      );
    })
    .join("");
  const legBottom = legStartY + (Math.ceil(norm.length / 2) - 1) * legStep;

  return { content: stats + segments + legend, bottom: Math.max(statsBottom, legBottom) + 18 };
}

// ---------------------------------------------------------------------------
// The whole profile as ONE SVG.
// ---------------------------------------------------------------------------
export function profileCard(o, s) {
  let y = BAR;
  const hero = heroSection(y);
  y = hero.bottom;

  const h1 = sectionHeader(y + 8, "// github stats");
  const streak = streakSection(s, h1.nextTop);
  y = streak.bottom;

  const h2 = sectionHeader(y + 8, "// stats & languages");
  const sl = statsLangSection(o, h2.nextTop);
  y = sl.bottom;

  const body = hero.content + h1.content + streak.content + h2.content + sl.content;
  return windowFrame({ width: W, height: y + 14, filename: "profile.ts", body });
}
