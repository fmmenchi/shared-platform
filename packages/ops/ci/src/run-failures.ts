// Asks GitHub what failed in the current run. The only side effect here is the HTTP call:
// what counts as a failure, and how it reads, is `eventFromRunFailures` in @fmmenchi/notify.
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
