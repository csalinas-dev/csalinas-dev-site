// The only channel that reaches a human without a deploy.
//
// The other one — the deploy's open/close of a `Substack sync is failing` issue
// (.github/workflows/deploy.yml) — is silent for as long as nobody pushes code.
// This one is silent if SMTP is broken or SUBSTACK_ALERT_EMAIL is unset. Their
// blind spots are complementary on purpose; neither is a log line.
//
// It uses the SMTP transport src/lib/auth.js already configures, so there is no
// new credential and no new service. `sendVerificationEmail` stays where it is
// (CLAUDE.md) — this builds its own transport rather than borrowing that one,
// because they share nothing but the four env vars.
//
// NEVER THROWS. It is the last step of a background callback that has already
// been handed a failure.
import { clearNotified, markNotified } from "./status";

// Two failures, spanning half an hour, before anybody's phone buzzes. The count
// rejects a single blip; the age rejects a momentary Substack outage that
// happened to land on a busy minute. Both are required — on a busy site the
// count alone would be met in seconds.
const MIN_FAILURES = 2;
const MIN_OUTAGE_MS = 30 * 60 * 1000;

// One mail a day while it stays broken. A repeat every ten minutes trains the
// recipient to filter the alert, which is the same as not sending it.
const RENOTIFY_MS = 24 * 60 * 60 * 1000;

const ENV_KEY = "SUBSTACK_ALERT_EMAIL";

// Once per process, not once per run: an unset variable is a permanent
// condition, and a line every ten minutes would be noise. Silence about a
// disabled alarm is the exact failure this module exists to prevent, so it is
// logged rather than assumed.
let announcedDisabled = false;

const code = (error) => error?.code ?? error?.name ?? "unknown";

const time = (value) => (value ? new Date(value).toISOString() : "never");

/**
 * Decide whether this status warrants a mail, and send it if so.
 *
 * Item-scope errors never reach here as a failure: `status.ok` follows
 * `report.ok`, which is false only for a feed-scope failure. One malformed post
 * surfaces in the deploy summary and nowhere else.
 *
 * @param {object|null} status the row from src/lib/substack/status.js
 */
export async function notifySyncStatus(status) {
  if (!status) return;

  const to = process.env[ENV_KEY];

  if (!to || !to.trim()) {
    if (!announcedDisabled) {
      announcedDisabled = true;
      console.warn(
        `[substack] ${ENV_KEY} is not set — sync failures will only surface at the next deploy.`
      );
    }

    return;
  }

  if (status.ok) {
    // Nothing was ever sent, so there is nothing to take back.
    if (!status.lastNotifiedAt) return;

    if (await send(to, recoveredMail(status))) await clearNotified();

    return;
  }

  if (!shouldAlert(status)) return;

  if (await send(to, failingMail(status))) await markNotified(new Date());
}

const shouldAlert = (status) => {
  if ((status.consecutiveFailures ?? 0) < MIN_FAILURES) return false;

  const since = status.firstFailureAt ? new Date(status.firstFailureAt).getTime() : null;

  if (since === null || Date.now() - since < MIN_OUTAGE_MS) return false;

  const last = status.lastNotifiedAt ? new Date(status.lastNotifiedAt).getTime() : null;

  return last === null || Date.now() - last >= RENOTIFY_MS;
};

const failingMail = (status) => ({
  subject: `[csalinas.dev] Substack sync has been failing since ${time(status.firstFailureAt)}`,
  text: [
    "The Substack sync has failed every time it has run since the timestamp below.",
    "",
    `First failure:        ${time(status.firstFailureAt)}`,
    `Consecutive failures: ${status.consecutiveFailures ?? 0}`,
    `Last attempt:         ${time(status.lastAttemptAt)}`,
    `Last success:         ${time(status.lastSuccessAt)}`,
    `Reason:               ${status.lastReason ?? "unknown"}`,
    "",
    "The blog is still serving the posts already stored — nothing has been lost or",
    "removed. What has stopped is new and edited posts arriving from Substack.",
    "",
    "Next steps: check SUBSTACK_FEED_URL in /srv/sites/csalinas.dev/_/app/.env, then",
    "run `docker compose run --rm app node scripts/sync-substack.mjs` there to see the",
    "failure in full.",
    "",
    "You will get one of these a day at most until it recovers, and one more when it does.",
  ].join("\n"),
});

const recoveredMail = (status) => ({
  subject: "[csalinas.dev] Substack sync recovered",
  text: [
    "The Substack sync is working again.",
    "",
    `Last success: ${time(status.lastSuccessAt)}`,
    "",
    "No action needed.",
  ].join("\n"),
});

// nodemailer is imported HERE rather than at module scope so the blog routes
// never bundle it for a path that runs at most once a day.
const send = async (to, { subject, text }) => {
  try {
    const { default: nodemailer } = await import("nodemailer");

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      secure: false, // true for 465, false for other ports — same as src/lib/auth.js
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });

    return true;
  } catch (error) {
    // By code. An SMTP library is free to quote the message it was given back at
    // you, and these logs are public.
    console.error(`[substack] alert email failed (${code(error)})`);

    return false;
  }
};
