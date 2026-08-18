import { describe, expect, it, vi } from 'vitest';
import {
  deliver,
  eventFromRunFailures,
  eventsFromReleases,
  parseEvents,
  toNotification,
} from './event.js';
import type { NotifyEvent } from './event.types.js';
import type { Transport } from './transport.types.js';

const release: NotifyEvent = {
  kind: 'release',
  app: '@fmmenchi/ui',
  version: '0.6.1',
  url: 'https://example.test/r',
};

const transport = (
  send: Transport['send'] = vi.fn(async () => undefined),
): Transport => ({ send });

describe('parseEvents', () => {
  it('accepts a batch and a single event alike', () => {
    expect(parseEvents([release])).toHaveLength(1);
    expect(parseEvents(release)).toHaveLength(1);
  });

  it('throws on a release with no version — the bug that shipped silence', () => {
    expect(() => parseEvents([{ kind: 'release', app: 'x' }])).toThrow(
      /"version"/,
    );
  });

  it('throws on an event with no app', () => {
    expect(() => parseEvents([{ kind: 'release', version: '1.0.0' }])).toThrow(
      /"app"/,
    );
  });

  it('throws on an unknown kind rather than inventing one', () => {
    expect(() => parseEvents([{ kind: 'deploy', app: 'x' }])).toThrow(/kind/);
  });

  it('names the offending index, so a batch of thirteen is debuggable', () => {
    expect(() => parseEvents([release, { kind: 'error', app: 'x' }])).toThrow(
      /event 1/,
    );
  });

  it('drops nothing it was given', () => {
    const parsed = parseEvents([release]);
    expect(parsed[0]).toMatchObject({ app: '@fmmenchi/ui', version: '0.6.1' });
  });
});

describe('toNotification', () => {
  it('renders a release with its link', () => {
    const notification = toNotification(release);
    expect(notification.kind).toBe('release');
    expect(notification.actions?.[0]?.url).toBe('https://example.test/r');
  });

  it('renders an error', () => {
    expect(
      toNotification({ kind: 'error', app: 'ci', message: 'the gate is red' }),
    ).toMatchObject({ kind: 'error' });
  });
});

describe('deliver', () => {
  it('counts what arrived, and does not report a boolean', async () => {
    const result = await deliver([release, release], transport());
    expect(result).toEqual({ total: 2, delivered: 2, failures: [] });
  });

  it('attempts every event — one failure must not silence the rest', async () => {
    let call = 0;
    const flaky = transport(async () => {
      call += 1;
      if (call === 1) throw new Error('channel_not_found');
    });

    const result = await deliver(
      [release, { ...release, app: '@fmmenchi/tokens' }],
      flaky,
    );

    expect(result.total).toBe(2);
    expect(result.delivered).toBe(1);
    expect(result.failures).toEqual([
      {
        app: '@fmmenchi/ui',
        reason: expect.stringContaining('channel_not_found'),
      },
    ]);
  });

  it('validates the WHOLE batch before sending any of it', async () => {
    const send = vi.fn(async () => undefined);
    await expect(
      deliver(
        [release, { kind: 'release', app: 'x' } as unknown as NotifyEvent],
        transport(send),
      ),
    ).rejects.toThrow(/"version"/);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('eventsFromReleases', () => {
  const released = [
    { project: '@fmmenchi/ui', version: '0.6.1', tag: '@fmmenchi/ui@0.6.1' },
  ];

  it('names the app from the project — no tag surgery', () => {
    expect(eventsFromReleases(released)[0]).toMatchObject({
      kind: 'release',
      app: '@fmmenchi/ui',
      version: '0.6.1',
    });
  });

  it('forms the release URL from the tag, encoded', () => {
    expect(
      eventsFromReleases(released, {
        repositoryUrl: 'https://github.com/o/r/',
      })[0]?.url,
    ).toBe('https://github.com/o/r/releases/tag/%40fmmenchi%2Fui%400.6.1');
  });

  it('omits the url rather than inventing an empty one', () => {
    expect(eventsFromReleases(released)[0]?.url).toBeUndefined();
  });

  it('carries the notes from the record — the field that was there and unread', () => {
    const [event] = eventsFromReleases([
      { ...released[0]!, notes: '### notes' },
    ]);
    expect(event?.kind === 'release' && event.body).toBe('### notes');
  });

  it('omits the body when the record has no notes', () => {
    const [event] = eventsFromReleases(released);
    expect(event?.kind === 'release' && event.body).toBeUndefined();
  });

  it('produces one event per released project — the batch notify expects', () => {
    expect(
      eventsFromReleases([
        ...released,
        { project: '@x/y', version: '1.0.0', tag: 'v1' },
      ]),
    ).toHaveLength(2);
  });
});

describe('eventFromRunFailures', () => {
  const base = { app: 'shared-platform', url: 'https://run/1', workflow: 'CI' };

  it('names the failed job and its failed steps', () => {
    const event = eventFromRunFailures({
      ...base,
      jobs: [
        {
          name: 'main',
          conclusion: 'failure',
          steps: [
            { name: 'Run tests', conclusion: 'failure' },
            { name: 'Lint', conclusion: 'success' },
          ],
        },
        { name: 'context', conclusion: 'success', steps: [] },
      ],
    });

    expect(event).toMatchObject({
      kind: 'error',
      app: 'shared-platform',
      url: 'https://run/1',
    });
    expect(event?.kind === 'error' && event.body).toBe('• main › Run tests');
  });

  it('keeps the reason to one line and puts the list in the body', () => {
    const event = eventFromRunFailures({
      ...base,
      jobs: [
        {
          name: 'a',
          conclusion: 'failure',
          steps: [{ name: 's1', conclusion: 'failure' }],
        },
        {
          name: 'b',
          conclusion: 'failure',
          steps: [{ name: 's2', conclusion: 'failure' }],
        },
      ],
    });

    // The title is what a phone shows; a multi-line one renders as an unreadable smear.
    expect(event?.kind === 'error' && event.message).toBe(
      'CI failed — 2 job(s)',
    );
    expect(event?.kind === 'error' && event.message).not.toContain('\n');
    expect(event?.kind === 'error' && event.body).toBe('• a › s1\n• b › s2');
  });

  it('sees a failed step inside a job that is still running — the same-job alert', () => {
    // A weekly audit alerting on its own scan: the job cannot have concluded yet, because
    // the step doing the alerting is part of it. Reading job.conclusion alone finds nothing.
    const event = eventFromRunFailures({
      ...base,
      workflow: 'Weekly audit',
      jobs: [
        {
          name: 'audit',
          conclusion: null,
          steps: [
            { name: 'Scan', conclusion: 'failure' },
            { name: 'Alert Slack', conclusion: null },
          ],
        },
      ],
    });

    expect(event?.kind === 'error' && event.message).toBe(
      'Weekly audit failed — 1 job(s)',
    );
    expect(event?.kind === 'error' && event.body).toBe('• audit › Scan');
  });

  it('reports a failed job with no step detail rather than dropping it', () => {
    const event = eventFromRunFailures({
      ...base,
      jobs: [{ name: 'deploy', conclusion: 'failure' }],
    });

    expect(event?.kind === 'error' && event.body).toBe('• deploy');
  });

  it('is null when nothing failed — the caller must not read that as success', () => {
    expect(
      eventFromRunFailures({
        ...base,
        jobs: [
          {
            name: 'main',
            conclusion: 'success',
            steps: [{ name: 'ok', conclusion: 'success' }],
          },
        ],
      }),
    ).toBeNull();
  });

  it('ignores cancelled and skipped, which are not failures', () => {
    expect(
      eventFromRunFailures({
        ...base,
        jobs: [
          {
            name: 'a',
            conclusion: 'cancelled',
            steps: [{ name: 's', conclusion: 'cancelled' }],
          },
          { name: 'b', conclusion: 'skipped', steps: [] },
        ],
      }),
    ).toBeNull();
  });
});

describe('parseEvents — attachments', () => {
  it('keeps a path and an optional title', () => {
    const [event] = parseEvents([
      {
        kind: 'error',
        app: 'a',
        message: 'boom',
        attachments: [{ path: 'r.json', title: 'Report' }],
      },
    ]);

    expect(event?.kind === 'error' && event.attachments).toEqual([
      { path: 'r.json', title: 'Report' },
    ]);
  });

  it('throws on an attachment without a path, naming which one', () => {
    expect(() =>
      parseEvents([
        {
          kind: 'error',
          app: 'a',
          message: 'boom',
          attachments: [{ title: 'no path' }],
        },
      ]),
    ).toThrow(/attachments\[0\]\.path/);
  });

  it('does not read the file — a report written later is still attachable', () => {
    expect(() =>
      parseEvents([
        {
          kind: 'error',
          app: 'a',
          message: 'boom',
          attachments: [{ path: '/not/yet.json' }],
        },
      ]),
    ).not.toThrow();
  });
});

describe('toNotification — error detail', () => {
  it('carries the body and the attachments through to the transport', () => {
    const notification = toNotification({
      kind: 'error',
      app: 'a',
      message: 'CI failed — 1 job(s)',
      body: '• main › Run tests',
      url: 'https://run',
      attachments: [{ path: 'r.json' }],
    });

    expect(notification.body).toBe('• main › Run tests');
    expect(notification.attachments).toEqual([{ path: 'r.json' }]);
    expect(notification.title).not.toContain('\n');
  });
});
