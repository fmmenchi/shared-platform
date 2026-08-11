import { describe, it, expect } from 'vitest';
import { initialsFromName } from './avatar.initials.js';

// Pure logic, tested where it lives (testing.md) — the component test asserts
// what RENDERS; this one pins the derivation itself, including the shapes that
// only exist to break `[0]`.
describe('initialsFromName', () => {
  it('takes the first grapheme of the first and last words', () => {
    expect(initialsFromName('Ada Lovelace')).toBe('AL');
    // Middle names do not shift the last initial.
    expect(initialsFromName('Ada King Lovelace')).toBe('AL');
  });

  it('takes the first two graphemes of a single word', () => {
    expect(initialsFromName('Plato')).toBe('Pl');
    expect(initialsFromName('李小龙')).toBe('李小');
  });

  it('keeps a one-grapheme word whole', () => {
    expect(initialsFromName('A')).toBe('A');
  });

  it('never splits a surrogate pair — the reason [0] is banned', () => {
    // Each letter is an astral-plane code point; charAt(0) would return a lone
    // surrogate that renders as a broken box.
    expect(initialsFromName('𝔄da 𝔏ovelace')).toBe('𝔄𝔏');
    expect(initialsFromName('𝔘nicode')).toBe('𝔘n');
  });

  it('keeps a ZWJ emoji cluster as one grapheme', () => {
    expect(initialsFromName('👩‍👩‍👧 Family')).toBe('👩‍👩‍👧F');
  });

  it('returns the empty string for an empty or whitespace name', () => {
    expect(initialsFromName('')).toBe('');
    expect(initialsFromName('   ')).toBe('');
  });

  it('ignores extra whitespace between words', () => {
    expect(initialsFromName('  Ada   Lovelace  ')).toBe('AL');
  });
});
