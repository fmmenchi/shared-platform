#!/usr/bin/env node
// The CI notify entrypoint: deliver a batch of events, and say how many arrived.
//
// It discovers nothing. The events are handed to it as data — what happened, about what,
// where to read more — because whoever knows those facts is upstream, and a step that
// re-derives them is a step that can derive them wrongly. Secrets come from the
// environment, never from the events: an event is data that may be logged or uploaded.
//
// The ONLY green skip is missing Slack secrets, and it announces itself. Every other
// missing thing fails, because "I had nothing to send" and "nobody gave me anything" must
// never look the same — that mistake is the whole reason releases went unannounced.
import { readFileSync } from 'node:fs';
import {
  deliver,
  eventFromRunFailures,
  eventsFromReleases,
  parseEvents,
  slack,
} from '@fmmenchi/notify';
import { fetchRunJobs, runContextFromEnv, runUrl } from './run-failures.js';
import type { NotifyEvent } from '@fmmenchi/notify';

const argValue = (name: string): string | undefined =>
  process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3);

const eventsFile = argValue('eventsFile') ?? process.env['NOTIFY_EVENTS_FILE'];
// A release record is the OTHER shape of the same input: the release step's own neutral
// output, turned into events by tested code (`eventsFromReleases`) rather than by cutting
// tags apart in a shell. One channel, a file; two shapes; one parsed type after it.
const releaseResult = argValue('releaseResult');
// The THIRD shape of the same one input: this run's own failures, asked of GitHub rather
// than described by hand. A workflow knows which of its steps it wrote; it does not know
// which of its jobs the run lost, so that fact is fetched instead of guessed.
const fromRun = process.argv.includes('--fromRun');
const attachments = process.argv
  .filter((arg) => arg.startsWith('--attach='))
  .map((arg) => ({ path: arg.slice('--attach='.length) }));

if (!eventsFile && !releaseResult && !fromRun) {
  console.error(
    'notify: pass --eventsFile=<path>, --releaseResult=<path> or --fromRun (or set NOTIFY_EVENTS_FILE).',
  );
  process.exit(1);
}

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf-8'));

// Parsed before anything else: a malformed batch is a broken caller, and it must fail
// before a single message goes out rather than halfway through.
let events: NotifyEvent[];

if (fromRun) {
  const context = runContextFromEnv(process.env);
  const event = eventFromRunFailures({
    app:
      process.env['NOTIFY_APP'] ||
      context.repository.split('/')[1] ||
      context.repository,
    url: runUrl(context),
    ...(context.workflow ? { workflow: context.workflow } : {}),
    jobs: await fetchRunJobs(context),
  });

  // Invoked because something went red, and nothing red found: the view is wrong — a token
  // without `actions: read`, or a job not visible yet — and staying quiet would hide the
  // original failure AND this one. Loud, with the run named.
  if (!event) {
    console.error(
      `::error::notify: --fromRun found no failed job or step in ${context.repository} run ${context.runId}. ` +
        `Nothing was sent. Check that the token has \`actions: read\` and that this step runs after ` +
        `the jobs it reports on.`,
    );
    process.exit(1);
  }

  events = [attachments.length > 0 ? { ...event, attachments } : event];
} else {
  events = releaseResult
    ? eventsFromReleases(
        (read(releaseResult) as { releases?: [] }).releases ?? [],
        { repositoryUrl: process.env['NOTIFY_REPOSITORY_URL'] ?? '' },
      )
    : parseEvents(read(eventsFile as string));
}

const token = process.env['SLACK_BOT_TOKEN'];
const channel = process.env['SLACK_CHANNEL_ID'];
if (!token || !channel) {
  console.log(
    `::notice::notify: SLACK_BOT_TOKEN or SLACK_CHANNEL_ID is not set — ${events.length} event(s) NOT sent.`,
  );
  process.exit(0);
}

if (events.length === 0) {
  console.log('notify: no events to deliver.');
  process.exit(0);
}

const result = await deliver(events, slack({ token, channel }));

for (const failure of result.failures) {
  console.error(`::error::notify: ${failure.app} — ${failure.reason}`);
}
console.log(`notify: delivered ${result.delivered}/${result.total}.`);

// Counted, not hoped: this is what makes a notification that never left the ground red.
if (result.delivered !== result.total) process.exit(1);
