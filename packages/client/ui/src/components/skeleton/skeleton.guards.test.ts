import { describe, it, expect } from 'vitest';
import { smuggledAria, deadAriaMessage } from './skeleton.guards.js';

/** Pure props question, so it is answered without rendering anything. */
describe('smuggledAria', () => {
  it('names what aria-hidden will annul', () => {
    expect(
      smuggledAria({ role: 'status', 'aria-live': 'polite', className: 'x' }),
    ).toEqual(['role', 'aria-live']);
  });

  it("says nothing about the component's own aria-hidden", () => {
    // The answer, not the mistake — warning about it would fire on the
    // component's own contract.
    expect(smuggledAria({ 'aria-hidden': true })).toEqual([]);
  });

  it('counts tabIndex, which is the same misunderstanding from the other side', () => {
    expect(smuggledAria({ tabIndex: -1 })).toEqual(['tabIndex']);
  });

  it('leaves ordinary div props alone', () => {
    expect(
      smuggledAria({ className: 'a', style: {}, id: 'b', shape: 'text' }),
    ).toEqual([]);
  });
});

describe('deadAriaMessage', () => {
  it('names the props and what to do instead', () => {
    const message = deadAriaMessage(['role']);
    expect(message).toContain('role');
    // A warning that only says "no" is noise; this one has to point at the
    // pattern that works.
    expect(message).toContain('role="status"');
  });

  it('agrees with itself about how many there are', () => {
    expect(deadAriaMessage(['role'])).toContain('role has no effect');
    expect(deadAriaMessage(['role', 'aria-live'])).toContain(
      'role, aria-live have no effect',
    );
  });
});
