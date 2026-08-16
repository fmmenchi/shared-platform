import { describe, it, expect } from 'vitest';
import { matches, says } from './combobox-filter.js';

/**
 * The combobox's two questions, and the fold behind both.
 *
 * This file exists because the fold was written twice in one package. The
 * combobox shipped its own — `NFD` plus a blind `\p{Diacritic}` strip, called
 * in its own comment "the one-line form of it that needs no table and no
 * dependency" — twenty lines from `filtering/filter.ts`, which had already met
 * that defect, documented it, fixed it and pinned it. Both folds shipped in
 * `dist`. Nothing failed, because nothing asked.
 */
describe('the combobox fold', () => {
  it('does not conflate a voiced kana with its unvoiced base', () => {
    // THE DEFECT THE SHARED FOLD EXISTS TO PREVENT, and the combobox re-shipped
    // it: the Japanese voiced sound marks are `Diacritic=Yes`, and `NFD` splits
    // every precomposed voiced kana into base + mark, so a blind strip folds
    // バス (bus) to ハス (lotus) and ガス (gas) to カス. Those are different
    // words, not accented spellings of one word.
    expect(matches('バス', 'ハス', 'ja')).toBe(false);
    expect(matches('ガス', 'カス', 'ja')).toBe(false);
    // And it still finds the word the reader actually typed.
    expect(matches('バス', 'バス', 'ja')).toBe(true);
  });

  it('is still forgiving about the accents it should be forgiving about', () => {
    expect(matches('Málaga', 'malaga', 'it')).toBe(true);
    expect(matches('Müller', 'muller', 'de')).toBe(true);
    expect(matches('José', 'jose', 'es')).toBe(true);
  });

  it('expands ß, which simple lowercasing does not', () => {
    // JavaScript exposes simple lowercase, not full case folding: `ß` has no
    // canonical decomposition and is not a diacritic, so the hand-rolled fold
    // answered false here.
    expect(matches('Straße', 'strasse', 'de')).toBe(true);
  });

  it('folds a word-final sigma to the one a reader types', () => {
    expect(matches('ΟΔΟΣ', 'οδος', 'el')).toBe(true);
  });

  it('folds compatibility forms, so a full-width keyboard matches', () => {
    expect(matches('ＡＢＣ', 'abc', 'ja')).toBe(true);
  });
});

describe('says — the question behind the offer to create', () => {
  it('is equality after the fold, not containment', () => {
    // The match is "contains", this is "already says". A row called Milano must
    // not suppress the offer to create "Mila".
    expect(says('Milano', 'Milano', 'it')).toBe(true);
    expect(says('Milano', 'milano', 'it')).toBe(true);
    expect(says('Milano', 'Mila', 'it')).toBe(false);
  });

  it('ignores the space at the end of what a person typed', () => {
    // Untrimmed, the filter dropped every row — so nothing said it, so the
    // offer appeared alone, and `onCreate` was handed the untrimmed string.
    expect(says('Milano', 'Milano ', 'it')).toBe(true);
    expect(says('Milano', ' Milano', 'it')).toBe(true);
  });

  it('uses the same fold as the match, which is the whole point', () => {
    // Asked with a plain `toLocaleLowerCase()` the two disagreed: `Málaga`
    // stayed in the list AND `Create “malaga”` appeared one row under it.
    expect(says('Málaga', 'malaga', 'it')).toBe(true);
    // And this one cannot be overridden by a consumer's `filter`, so its fold
    // matters more than the match's: under the blind strip a catalogue holding
    // バス suppressed the offer to create ハス, with no public way to say
    // otherwise.
    expect(says('バス', 'ハス', 'ja')).toBe(false);
  });
});
