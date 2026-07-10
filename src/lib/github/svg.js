import { palette, fontFamily } from "./palette";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const fmtNum = (n) => n.toLocaleString("en-US");

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function fmtRange(start, end, { openEnded = false } = {}) {
  if (!start) return "—";
  if (openEnded) return `${fmtDate(start)} – Present`;
  if (start === end) return fmtDate(start);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

const esc = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

// ---------------------------------------------------------------------------
// Editor-window chrome shared by every card.
// Windows-style: filename on the left, minimize / maximize / close controls on
// the right (thin line icons — no macOS traffic lights).
// ---------------------------------------------------------------------------
const BAR = 36;

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
    /* Base state is visible; the animation only fades in. Renderers that
       don't run CSS animations still show the content at full opacity. */
    .fade { animation: fadeIn 0.8s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    text { font-family: ${fontFamily}; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10"
        fill="${palette.background}" stroke="${palette.border}" />
  <!-- title bar -->
  <text x="16" y="${BAR / 2 + 4}" font-size="12" fill="${palette.muted}">${esc(filename)}</text>
  ${windowControls(width)}
  <line x1="0" y1="${BAR}" x2="${width}" y2="${BAR}" stroke="${palette.border}" />
  <g class="fade">${body}</g>
</svg>`;
}

const label = (x, y, text, { size = 12, fill = palette.muted, anchor = "middle", weight = 400 } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`;

// ---------------------------------------------------------------------------
// Streak card — Total Contributions | Current Streak | Longest Streak
// The three columns share number / label / date baselines so everything lines
// up horizontally, and the block is vertically centred in the card body.
// ---------------------------------------------------------------------------
export function streakCard(s) {
  const W = 500;
  const H = 210;
  const cols = [W / 6, W / 2, (W * 5) / 6];
  const div1 = W / 3;
  const div2 = (W * 2) / 3;

  // Shared baselines (aligned across all three columns).
  const yNum = 112; // big number baseline (left/right)
  const yLabel = 148;
  const yDate = 174;

  const divider = (x) =>
    `<line x1="${x}" y1="54" x2="${x}" y2="${H - 18}" stroke="${palette.border}" />`;

  const left = [
    label(cols[0], yNum, fmtNum(s.total), { size: 30, fill: palette.foreground, weight: 700 }),
    label(cols[0], yLabel, "Total Contributions", { size: 11.5, fill: palette.muted }),
    label(cols[0], yDate, fmtRange(s.firstContribution, null, { openEnded: true }), { size: 10.5, fill: palette.comment }),
  ].join("");

  const right = [
    label(cols[2], yNum, fmtNum(s.longest.length), { size: 30, fill: palette.foreground, weight: 700 }),
    label(cols[2], yLabel, "Longest Streak", { size: 11.5, fill: palette.muted }),
    label(cols[2], yDate, fmtRange(s.longest.start, s.longest.end), { size: 10.5, fill: palette.comment }),
  ].join("");

  // Center: current streak inside a ring; its number sits on the same visual
  // axis as the left/right numbers, and its label/date share the baselines.
  const cx = cols[1];
  const ringCy = 98;
  const r = 34;
  const circ = 2 * Math.PI * r;
  const ring = `
    <circle cx="${cx}" cy="${ringCy}" r="${r}" fill="none" stroke="${palette.border}" stroke-width="6" />
    <circle cx="${cx}" cy="${ringCy}" r="${r}" fill="none" stroke="${palette.const}" stroke-width="6"
            stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${(circ * 0.28).toFixed(1)}"
            transform="rotate(-90 ${cx} ${ringCy})" />`;
  const center = [
    ring,
    label(cx, ringCy - r - 4, "🔥", { size: 18 }),
    label(cx, ringCy + 8, fmtNum(s.current.length), { size: 24, fill: palette.foreground, weight: 700 }),
    label(cx, yLabel, "Current Streak", { size: 12, fill: palette.const, weight: 700 }),
    label(cx, yDate, s.current.length ? fmtRange(s.current.start, s.current.end) : "—", { size: 10.5, fill: palette.comment }),
  ].join("");

  return windowFrame({
    width: W,
    height: H,
    filename: "commit-streak.ts",
    body: divider(div1) + divider(div2) + left + center + right,
  });
}

// ---------------------------------------------------------------------------
// Stats card — overview grid
// ---------------------------------------------------------------------------
export function statsCard(o) {
  const W = 480;
  const rows = [
    { icon: "★", color: palette.parenthesis, label: "Total Stars Earned", value: o.stars },
    { icon: "⚇", color: palette.type, label: "Total Commits (incl. private)", value: o.commits },
    { icon: "⇆", color: palette.module, label: "Total PRs", value: o.pullRequests },
    { icon: "⚠", color: palette.selector, label: "Total Issues", value: o.issues },
    { icon: "◎", color: palette.component, label: "Public Repos", value: o.repos },
    { icon: "♡", color: palette.regex, label: "Followers", value: o.followers },
  ];

  const commentY = 62;
  const startY = 92;
  const stepY = 21;
  const H = startY + (rows.length - 1) * stepY + 22;

  const title = `<text x="26" y="${commentY}" font-size="13" fill="${palette.comment}">// ${esc(o.name)} — GitHub stats</text>`;

  const body = rows
    .map((r, i) => {
      const y = startY + i * stepY;
      return (
        `<text x="26" y="${y}" font-size="14" fill="${r.color}">${esc(r.icon)}</text>` +
        `<text x="48" y="${y}" font-size="13" fill="${palette.foreground}">${esc(r.label)}</text>` +
        `<text x="${W - 26}" y="${y}" text-anchor="end" font-size="13.5" font-weight="700" fill="${palette.numeric}">${esc(fmtNum(r.value))}</text>`
      );
    })
    .join("");

  return windowFrame({ width: W, height: H, filename: "stats.ts", body: title + body });
}

// ---------------------------------------------------------------------------
// Languages card — stacked bar + legend
// ---------------------------------------------------------------------------
export function languagesCard(o, { count = 6 } = {}) {
  const W = 340;
  const langs = o.languages.slice(0, count);
  const shown = langs.reduce((s, l) => s + l.percent, 0) || 1;
  // Renormalise the shown languages so the bar fills the width.
  const norm = langs.map((l) => ({ ...l, pct: (l.percent / shown) * 100 }));

  const commentY = 60;
  const barX = 26;
  const barY = 76;
  const barW = W - 52;
  const barH = 12;
  const legendStartY = 108;
  const legendStep = 22;
  const legendRows = Math.ceil(norm.length / 2);
  const H = legendStartY + (legendRows - 1) * legendStep + 18;

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

  const legend = norm
    .map((l, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = barX + col * (barW / 2);
      const y = legendStartY + row * legendStep;
      return (
        `<circle cx="${x + 6}" cy="${y - 4}" r="5" fill="${l.color || palette.muted}" />` +
        `<text x="${x + 18}" y="${y}" font-size="12" fill="${palette.foreground}">${esc(l.name)}</text>` +
        `<text x="${x + 24 + l.name.length * 7.3}" y="${y}" font-size="11" fill="${palette.muted}">${l.percent.toFixed(1)}%</text>`
      );
    })
    .join("");

  const title = `<text x="26" y="${commentY}" font-size="13" fill="${palette.comment}">// most used languages</text>`;

  return windowFrame({ width: W, height: H, filename: "languages.ts", body: title + segments + legend });
}
