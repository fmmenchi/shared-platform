import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventFromRunFailures } from '@fmmenchi/notify';
import { describeRunJobs, findInRunJobs } from './run-failures.js';
import type { RunJob } from '@fmmenchi/notify';
import type { RunContext } from './run-failures.js';

const context: RunContext = {
  repository: 'fmmenchi/andes-routes',
  runId: '38263838278',
  token: 't',
  apiUrl: 'https://api.test',
  serverUrl: 'https://github.test',
  workflow: 'Weekly audit',
};

// The decision under test is the real one, not a stand-in: what these tests pin is that the
// waiting hands `eventFromRunFailures` a fresh view each time and stops when it answers.
const find = (jobs: RunJob[]) =>
  eventFromRunFailures({
    app: 'andes-routes',
    url: 'https://run',
    workflow: 'Weekly audit',
    jobs,
  });

// The same-job shape, as the API shows it in the moment after the scan failed: the runner
// has moved on to the alerting step, and the failed one is not published as failed yet.
const lagging = [
  {
    name: 'audit',
    status: 'in_progress',
    conclusion: null,
    steps: [
      { name: 'Scan', status: 'in_progress', conclusion: null },
      { name: 'Alert Slack', status: 'queued', conclusion: null },
    ],
  },
];

const caughtUp = [
  {
    name: 'audit',
    status: 'in_progress',
    conclusion: null,
    steps: [
      { name: 'Scan', status: 'completed', conclusion: 'failure' },
      { name: 'Alert Slack', status: 'in_progress', conclusion: null },
    ],
  },
];

/** Answers each request with the next view; the last one repeats, as a settled API would. */
const stubViews = (...views: unknown[][]) => {
  let call = 0;
  const fetch = vi.fn(async () => {
    const jobs = views[Math.min(call, views.length - 1)] as unknown[];
    call += 1;
    return new Response(JSON.stringify({ total_count: jobs.length, jobs }));
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

const sleep = () => vi.fn(async (_ms: number) => undefined);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('findInRunJobs', () => {
  it('answers on the first look when the failed step is already visible', async () => {
    const fetch = stubViews(caughtUp);
    const wait = sleep();

    const result = await findInRunJobs(context, find, { sleep: wait });

    expect(result.found).toMatchObject({ body: '• audit › Scan' });
    expect(result.looks).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  // THE REGRESSION. andes-routes run 38263838278: asked 0.6s after the scan failed, the API
  // showed no failed step, and the one look there was reported "nothing failed" on a red run.
  it('looks again when the API has not caught up, and finds it on a later look', async () => {
    const fetch = stubViews(lagging, lagging, caughtUp);
    const wait = sleep();

    const result = await findInRunJobs(context, find, {
      intervalMs: 2_000,
      timeoutMs: 30_000,
      sleep: wait,
    });

    expect(result.found).toMatchObject({
      message: 'Weekly audit failed — 1 job(s)',
      body: '• audit › Scan',
    });
    expect(result.looks).toBe(3);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[2_000], [2_000]]);
  });

  it('gives up when the time runs out, with null and the last view — never a success', async () => {
    const fetch = stubViews(lagging);
    const wait = sleep();

    const result = await findInRunJobs(context, find, {
      intervalMs: 2_000,
      timeoutMs: 6_000,
      sleep: wait,
    });

    expect(result.found).toBeNull();
    expect(result.jobs).toEqual(lagging);
    // 6s of waiting in 2s steps: a look at 0, 2, 4 and 6s, and no sleep after the last one.
    expect(result.looks).toBe(4);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledTimes(3);
  });

  it('answers at once from a separate job, where the failed job has concluded', async () => {
    // `needs:` + `if: failure()`: the job-level conclusion is the signal and it is final by
    // the time the reporting job starts. Nothing here may cost that shape a wait.
    const fetch = stubViews([
      {
        name: 'main',
        status: 'completed',
        conclusion: 'failure',
        steps: [
          { name: 'Run tests', status: 'completed', conclusion: 'failure' },
        ],
      },
      { name: 'report', status: 'in_progress', conclusion: null, steps: [] },
    ]);
    const wait = sleep();

    const result = await findInRunJobs(context, find, { sleep: wait });

    expect(result.found).toMatchObject({ body: '• main › Run tests' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it('does not wait on a refusal — that is not an empty answer', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetch);
    const wait = sleep();

    await expect(findInRunJobs(context, find, { sleep: wait })).rejects.toThrow(
      /HTTP 404/,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
});

describe('describeRunJobs', () => {
  it('shows status beside conclusion, which is what tells a lagging view apart', () => {
    expect(describeRunJobs(lagging)).toBe(
      '  audit [in_progress/none]: Scan=in_progress/none, Alert Slack=queued/none',
    );
  });

  it('says so when the API listed no jobs, rather than printing nothing', () => {
    expect(describeRunJobs([])).toMatch(/no jobs at all/);
  });
});
