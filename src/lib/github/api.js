// GitHub data layer for the custom stat cards.
//
// Auth: set GITHUB_STATS_TOKEN in the environment to a GitHub Personal Access
// Token for the csalinas-dev account. A classic token with scopes `read:user`
// and `repo` lets the contribution calendar include PRIVATE contributions
// (otherwise only public ones are counted). The token is read server-side only
// and never leaves the server.

import { unstable_cache } from "next/cache";

const GRAPHQL = "https://api.github.com/graphql";
const USERNAME = process.env.GITHUB_STATS_USERNAME || "csalinas-dev";

// Cache upstream GitHub responses for 6h at the data-fetch layer so we don't
// burn the token's rate limit on every card request.
const REVALIDATE_SECONDS = 60 * 60 * 6;

async function gql(query, variables = {}) {
  const token = process.env.GITHUB_STATS_TOKEN;
  if (!token) {
    throw new Error("GITHUB_STATS_TOKEN is not set");
  }
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`GitHub GraphQL error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${json.errors[0].message}`);
  }
  return json.data;
}

// List every calendar year from account creation to now (contribution windows
// are capped at one year, so lifetime figures are stitched year-by-year).
async function getYears() {
  const data = await gql(
    `query ($login: String!) { user(login: $login) { createdAt } }`,
    { login: USERNAME }
  );
  const start = new Date(data.user.createdAt).getUTCFullYear();
  const end = new Date().getUTCFullYear();
  const years = [];
  for (let y = start; y <= end; y++) years.push(y);
  return { years, createdAt: data.user.createdAt };
}

// ---------------------------------------------------------------------------
// Overview stats (stars, commits, PRs, issues, followers, repos, languages)
// ---------------------------------------------------------------------------
async function fetchOverview() {
  const { years } = await getYears();

  // Lifetime commits incl. private: sum public commit contributions and
  // restricted (private) contributions across every year.
  const commitAliases = years
    .map(
      (y) => `c${y}: contributionsCollection(
        from: "${y}-01-01T00:00:00Z"
        to: "${y}-12-31T23:59:59Z"
      ) { totalCommitContributions restrictedContributionsCount }`
    )
    .join("\n");

  const data = await gql(
    `query ($login: String!) {
      user(login: $login) {
        name
        login
        createdAt
        followers { totalCount }
        pullRequests { totalCount }
        issues { totalCount }
        ${commitAliases}
        repositories(
          first: 100
          ownerAffiliations: OWNER
          isFork: false
          orderBy: { field: STARGAZERS, direction: DESC }
        ) {
          totalCount
          nodes {
            stargazerCount
            languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
              edges {
                size
                node { name color }
              }
            }
          }
        }
      }
    }`,
    { login: USERNAME }
  );

  const user = data.user;
  const repos = user.repositories.nodes;

  const commits = years.reduce(
    (sum, y) =>
      sum +
      user[`c${y}`].totalCommitContributions +
      user[`c${y}`].restrictedContributionsCount,
    0
  );

  const totalStars = repos.reduce((sum, r) => sum + r.stargazerCount, 0);

  // Aggregate language bytes across all owned repos.
  const langBytes = new Map();
  for (const repo of repos) {
    for (const edge of repo.languages.edges) {
      const { name, color } = edge.node;
      const prev = langBytes.get(name) || { name, color, size: 0 };
      prev.size += edge.size;
      langBytes.set(name, prev);
    }
  }
  const totalBytes = [...langBytes.values()].reduce((s, l) => s + l.size, 0) || 1;
  const languages = [...langBytes.values()]
    .sort((a, b) => b.size - a.size)
    .map((l) => ({ ...l, percent: (l.size / totalBytes) * 100 }));

  return {
    name: user.name || user.login,
    login: user.login,
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    repos: user.repositories.totalCount,
    pullRequests: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    commits,
    stars: totalStars,
    languages,
  };
}

// ---------------------------------------------------------------------------
// Lifetime contribution calendar + streak math (includes private)
// ---------------------------------------------------------------------------
async function fetchStreak() {
  // GitHub caps a contributionsCollection window at one year, so we fetch the
  // calendar year-by-year (aliased into a single request) from account
  // creation to today and stitch the days together.
  const { years } = await getYears();

  const aliases = years
    .map(
      (y) => `y${y}: contributionsCollection(
        from: "${y}-01-01T00:00:00Z"
        to: "${y}-12-31T23:59:59Z"
      ) {
        contributionCalendar {
          weeks { contributionDays { date contributionCount } }
        }
      }`
    )
    .join("\n");

  const data = await gql(
    `query ($login: String!) { user(login: $login) { ${aliases} } }`,
    { login: USERNAME }
  );

  // Flatten + dedupe days (year-boundary weeks can overlap) into a date->count map.
  const byDate = new Map();
  for (const y of years) {
    const weeks = data.user[`y${y}`].contributionCalendar.weeks;
    for (const week of weeks) {
      for (const day of week.contributionDays) {
        byDate.set(day.date, day.contributionCount);
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const days = [...byDate.entries()]
    .filter(([date]) => date <= today) // ignore future padding days
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  return computeStreakStats(days);
}

function computeStreakStats(days) {
  const total = days.reduce((s, d) => s + d.count, 0);
  const firstContribution = days.find((d) => d.count > 0)?.date || days[0]?.date;

  // Longest streak: scan for the longest run of consecutive days with > 0.
  let longest = { length: 0, start: null, end: null };
  let run = { length: 0, start: null, end: null };
  for (const day of days) {
    if (day.count > 0) {
      if (run.length === 0) run.start = day.date;
      run.length += 1;
      run.end = day.date;
      if (run.length > longest.length) longest = { ...run };
    } else {
      run = { length: 0, start: null, end: null };
    }
  }

  // Current streak: walk backward from the most recent day. A zero on *today*
  // doesn't break the streak (the day isn't over), so start from the last day
  // that either has contributions or, if today is empty, from yesterday.
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i -= 1; // skip an empty "today"
  const current = { length: 0, start: null, end: null };
  if (i >= 0 && days[i].count > 0) {
    current.end = days[i].date;
    while (i >= 0 && days[i].count > 0) {
      current.length += 1;
      current.start = days[i].date;
      i -= 1;
    }
  }

  return { total, firstContribution, current, longest };
}

// ---------------------------------------------------------------------------
// Cached public API.
//
// The card route reads request headers (for Camo/key gating), which makes the
// route dynamic — Next can no longer full-route-cache it, so the handler runs
// on every request. These wrappers keep the PAT safe by memoizing the upstream
// GitHub GraphQL results in the Data Cache for 6h, independent of how often the
// route is hit. This is the primary defense against burning the token's rate
// limit; the gate + rate limiter in the route are defense-in-depth on top.
// ---------------------------------------------------------------------------
export const getOverview = unstable_cache(fetchOverview, ["github-overview"], {
  revalidate: REVALIDATE_SECONDS,
  tags: ["github-card"],
});

export const getStreak = unstable_cache(fetchStreak, ["github-streak"], {
  revalidate: REVALIDATE_SECONDS,
  tags: ["github-card"],
});
