import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useDevWarning } from './use-dev-warning.js';

function Probe({ active }: { active: boolean }) {
  useDevWarning(active, 'boom');
  return null;
}

afterEach(() => vi.restoreAllMocks());

describe('useDevWarning', () => {
  it('warns when active', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Probe active />);
    expect(warn).toHaveBeenCalledWith('boom');
  });

  it('does not warn when inactive', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Probe active={false} />);
    expect(warn).not.toHaveBeenCalled();
  });
});
