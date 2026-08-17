import { describe, expect, it, vi } from 'vitest';
import {
  deliver,
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
