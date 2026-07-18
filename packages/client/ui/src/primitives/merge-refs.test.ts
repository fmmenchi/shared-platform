import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { mergeRefs } from './merge-refs.js';

describe('mergeRefs', () => {
  it('assigns the node to both an object ref and a callback ref', () => {
    const objectRef = createRef<HTMLDivElement>();
    const callbackRef = vi.fn();
    const node = document.createElement('div');

    mergeRefs(objectRef, callbackRef)(node);

    expect(objectRef.current).toBe(node);
    expect(callbackRef).toHaveBeenCalledWith(node);
  });

  it('ignores nullish refs', () => {
    const objectRef = createRef<HTMLDivElement>();
    const node = document.createElement('div');

    expect(() =>
      mergeRefs(undefined, objectRef, null as never)(node),
    ).not.toThrow();
    expect(objectRef.current).toBe(node);
  });
});
