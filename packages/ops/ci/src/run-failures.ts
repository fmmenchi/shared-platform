// Asks GitHub what failed in the current run. The only side effects here are the HTTP call
// and the waiting between two of them: what counts as a failure, and how it reads, is
// `eventFromRunFailures` in @fmmenchi/notify.
import type { RunJob } from '@fmmenchi/notify';

/** The env a GitHub Actions step already has; named so the failure messages can be exact. */
export interface RunContext {
  repository: string;
  runId: string;
  token: string;
  apiUrl: string;
  serverUrl: string;
  workflow?: string;
}

/**
 * Reads the run context out of the environment, and refuses to guess.
 *
 * Every one of these is set by Actions itself except the token, which the caller must pass
 * in — and a missing token is the interesting failure: without it the API answers 404 for a
 * private repo rather than 401, which would read as "nothing failed" instead of "I was not
 * allowed to look".
 */
export function runContextFromEnv(env: NodeJS.ProcessEnv): RunContext {
  const missing = (['GITHUB_REPOSITORY', 'GITHUB_RUN_ID'] as const).filter(
    (key) => !env[key],
  );
  if (missing.length > 0) {
    throw new Error(
      `notify: ${missing.join(' and ')} not set — --fromRun only works inside a GitHub Actions run.`,
    );
  }
  const token = env['GITHUB_TOKEN'] ?? env['GH_TOKEN'];
  if (!token) {
    throw new Error(
      "notify: GITHUB_TOKEN is not set. Reading a run's jobs needs `actions: read`; without a " +
        'token the API answers 404 on a private repo, which would look exactly like "nothing failed".',
    );
  }
  return {
    repository: env['GITHUB_REPOSITORY'] as string,
    runId: env['GITHUB_RUN_ID'] as string,
    token,
    apiUrl: env['GITHUB_API_URL'] ?? 'https://api.github.com',
    serverUrl: env['GITHUB_SERVER_URL'] ?? 'https://github.com',
    ...(env['GITHUB_WORKFLOW'] ? { workflow: env['GITHUB_WORKFLOW'] } : {}),
  };
}

/** The run's own page — where a Slack reader goes next. */
export const runUrl = ({ serverUrl, repository, runId }: RunContext): string =>
  `${serverUrl}/${repository}/actions/runs/${runId}`;

/**
 * Every job of the run, following pagination.
 *
 * Paginated deliberately rather than taking the first 100: a workflow with a large matrix
 * would silently lose the failing job, and "the report named nothing" is the failure mode
 * this whole package is built to avoid.
 */
export async function fetchRunJobs(context: RunContext): Promise<RunJob[]> {
  const jobs: RunJob[] = [];
  for (let page = 1; ; page += 1) {
    const url =
      `${context.apiUrl}/repos/${context.repository}/actions/runs/${context.runId}/jobs` +
      `?per_page=100&page=${page}&filter=latest`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${context.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      throw new Error(
        `notify: GitHub refused the run's jobs (HTTP ${response.status}). The token needs \`actions: read\`.`,
      );
    }
    const body = (await response.json()) as {
      total_count?: number;
      jobs?: RunJob[];
    };
    const batch = body.jobs ?? [];
    jobs.push(...batch);
    if (
      batch.length < 100 ||
      jobs.length >= (body.total_count ?? jobs.length)
    ) {
      return jobs;
    }
  }
}

/** How long `findInRunJobs` keeps looking. `sleep` is a parameter so a test need not wait. */
export interface LookOptions {
  /** Total time spent WAITING between looks; the requests themselves are not counted. */
  timeoutMs?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/** What the looking ended with: the answer, and the evidence it was (not) found in. */
export interface LookResult<T> {
  found: T | null;
  /** The jobs as the LAST look saw them — what an empty answer has to be explained with. */
  jobs: RunJob[];
  looks: number;
}

/**
 * Looks at the run's jobs until `find` answers, or the time runs out.
 *
 * One look is not enough, and that was measured rather than supposed: the jobs API trails the
 * runner. A step alerting on a failure in its OWN job asked 0.6s after the failed step ended
 * (andes-routes run 38263838278), was shown a job with no failed step in it, and reported
 * that nothing had failed — on the one run where something had. Asked again later, the same
 * endpoint named the step. So an empty answer is looked at again before it is believed.
 *
 * Only the empty answer waits. A failure visible on the first look returns at once, which is
 * every use from a separate job (`needs:` + `if: failure()`): those jobs have concluded.
 *
 * `find` decides and this function waits — it never inspects a job itself, so what counts as
 * a failure stays in one pure place. When the time runs out the answer is still `null`, and
 * the caller still has to fail on it: waiting makes the empty answer rarer, not acceptable.
 */
export async function findInRunJobs<T>(
  context: RunContext,
  find: (jobs: RunJob[]) => T | null,
  {
    timeoutMs = 30_000,
    intervalMs = 2_000,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  }: LookOptions = {},
): Promise<LookResult<T>> {
  for (let looks = 1, waited = 0; ; looks += 1, waited += intervalMs) {
    const jobs = await fetchRunJobs(context);
    const found = find(jobs);
    if (found !== null || waited + intervalMs > timeoutMs) {
      return { found, jobs, looks };
    }
    await sleep(intervalMs);
  }
}

/**
 * The jobs as the API showed them, one line each — for the error that says nothing was found.
 *
 * `status` is read here although `RunJob` does not declare it: the decision never needs it,
 * but "the job was in_progress and its step had no conclusion" is exactly the sentence that
 * tells a lagging view from a token that sees nothing.
 */
export function describeRunJobs(jobs: readonly RunJob[]): string {
  const state = (item: { conclusion: string | null; status?: string }) =>
    `${item.status ?? 'unknown'}/${item.conclusion ?? 'none'}`;
  if (jobs.length === 0) return '  (the API listed no jobs at all)';
  return jobs
    .map((job) => {
      const steps = (job.steps ?? [])
        .map((step) => `${step.name}=${state(step)}`)
        .join(', ');
      return `  ${job.name} [${state(job)}]${steps ? `: ${steps}` : ''}`;
    })
    .join('\n');
}
