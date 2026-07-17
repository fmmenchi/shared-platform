import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { userEvent as browserUser } from '@vitest/browser/context';
import { Dialog } from './dialog.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const noop = () => undefined;

describe('Dialog', () => {
  it('exposes dialog semantics with its accessible name when open', () => {
    renderUi(
      <Dialog open onClose={noop} title="Delete item">
        Are you sure?
      </Dialog>,
    );
    expect(
      screen.getByRole('dialog', { name: 'Delete item' }),
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderUi(
      <Dialog open onClose={noop} title="Delete item">
        Are you sure?
      </Dialog>,
    );
    await expectNoA11yViolations(container);
  });

  it('resolves the DS "Close" label from the active locale (self-contained)', () => {
    renderUi(
      <Dialog open onClose={noop} title="T">
        body
      </Dialog>,
      { locale: 'it' },
    );
    // The consumer never passes "Chiudi"; it comes from the DS catalog.
    expect(screen.getByRole('button', { name: 'Chiudi' })).toBeInTheDocument();
  });

  it('calls onClose when the close button is activated', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderUi(
      <Dialog open onClose={onClose} title="T">
        body
      </Dialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape (native dialog behavior)', async () => {
    const onClose = vi.fn();
    renderUi(
      <Dialog open onClose={onClose} title="T">
        body
      </Dialog>,
    );
    // Real browser keyboard (Playwright) so the native <dialog> `cancel` fires.
    await browserUser.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('is not in the accessibility tree when closed', () => {
    renderUi(
      <Dialog open={false} onClose={noop} title="T">
        body
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('matches the rendered snapshot when open', () => {
    const { baseElement } = renderUi(
      <Dialog open onClose={noop} title="Delete item">
        Are you sure?
      </Dialog>,
    );
    expect(baseElement.querySelector('dialog')).toMatchSnapshot();
  });
});
