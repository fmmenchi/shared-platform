import { parseCommits } from './git';

describe('parseCommits', () => {
  it('splits each line into short sha and subject on the first tab', () => {
    const raw =
      '565fee8\tfix(mobile): restore stack semantics\n24be908\trefactor: fold goBackOr';

    expect(parseCommits(raw)).toEqual([
      { sha: '565fee8', subject: 'fix(mobile): restore stack semantics' },
      { sha: '24be908', subject: 'refactor: fold goBackOr' },
    ]);
  });

  it('keeps a subject that itself contains tabs or arrows intact', () => {
    const raw = '7a831c7\tMerge pull request #3504 from Wishew/fix\ta\tb';

    /* Only the FIRST tab delimits — the rest belongs to the subject. */
    expect(parseCommits(raw)).toEqual([
      {
        sha: '7a831c7',
        subject: 'Merge pull request #3504 from Wishew/fix\ta\tb',
      },
    ]);
  });

  it('drops blank lines and trailing carriage returns', () => {
    const raw = 'aaa\tfirst\r\n\n\nbbb\tsecond\n';

    expect(parseCommits(raw)).toEqual([
      { sha: 'aaa', subject: 'first' },
      { sha: 'bbb', subject: 'second' },
    ]);
  });

  it('returns nothing for an empty range', () => {
    expect(parseCommits('')).toEqual([]);
    expect(parseCommits('\n')).toEqual([]);
  });
});
