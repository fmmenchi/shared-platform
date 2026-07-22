import {
  errorNotification,
  formatChangelog,
  releaseNotification,
} from './notification.js';
import type { Changelog } from './notification.types.js';

describe('releaseNotification', () => {
  it('is a channel-neutral release notification with a bare-v title and a link', () => {
    const n = releaseNotification('dev-blog', '1.0.0', 'https://gh/tag/v1.0.0');

    expect(n.kind).toBe('release');
    expect(n.text).toBe('dev-blog v1.0.0 released'); // plain fallback
    expect(n.title).toContain('dev-blog');
    expect(n.title).toContain('`v1.0.0`');
    expect(n.title).not.toContain('vv');
    expect(n.body).toBeUndefined(); // no changelog → thin
    expect(n.actions).toEqual([
      { label: 'View release', url: 'https://gh/tag/v1.0.0' },
    ]);
  });

  it('renders structured commits into the markdown body', () => {
    const changelog: Changelog = {
      fromRef: 'e99cade',
      toRef: '7a831c7',
      commits: [{ sha: '565fee8', subject: 'fix: restore stack semantics' }],
    };
    const n = releaseNotification('wishew', '3.0.4', 'https://gh', changelog);

    expect(n.body).toContain('e99cade');
    expect(n.body).toContain('- `565fee8` fix: restore stack semantics');
  });

  it('takes a pre-rendered body verbatim (the notes nx release wrote)', () => {
    const n = releaseNotification('@fmmenchi/notify', '0.0.2', 'https://gh', {
      body: '### Features\n- **notify:** channel-agnostic',
    });
    expect(n.body).toBe('### Features\n- **notify:** channel-agnostic');
  });
});

describe('errorNotification', () => {
  it('names the source and links back to the run', () => {
    const n = errorNotification(
      'dev-blog',
      'the scan went red',
      'https://ci/run/1',
    );
    expect(n.kind).toBe('error');
    expect(n.title).toContain('dev-blog');
    expect(n.actions?.[0]).toEqual({
      label: 'See the run',
      url: 'https://ci/run/1',
    });
  });
});

describe('formatChangelog', () => {
  it('renders the range and one bullet per commit', () => {
    const out = formatChangelog({
      fromRef: 'aaa',
      toRef: 'bbb',
      commits: [
        { sha: 'c1', subject: 'first' },
        { sha: 'c2', subject: 'second' },
      ],
    });
    expect(out).toContain('`aaa` → `bbb`');
    expect(out).toContain('- `c1` first');
    expect(out).toContain('- `c2` second');
  });

  it('states an empty range rather than a bare header', () => {
    expect(
      formatChangelog({ fromRef: 'a', toRef: 'b', commits: [] }),
    ).toContain('no commits');
  });

  it('caps a long history with an explicit +N more — never a silent cut', () => {
    const commits = Array.from({ length: 20 }, (_, i) => ({
      sha: `c${i}`,
      subject: `commit ${i}`,
    }));
    const out = formatChangelog({ fromRef: 'a', toRef: 'b', commits });

    expect(out).toContain('- `c14` commit 14');
    expect(out).not.toContain('- `c15` commit 15');
    expect(out).toContain('+5 more');
  });
});
