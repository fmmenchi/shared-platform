import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Popover } from '../popover/popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { PopoverHeading } from './popover-heading.component.js';

describe('PopoverHeading', () => {
  it('forwards its ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Popover>
        <PopoverContent>
          <PopoverHeading ref={ref}>Share this page</PopoverHeading>
        </PopoverContent>
      </Popover>,
    );
    expect(ref.current).toBe(
      screen.getByRole('heading', { name: 'Share this page', hidden: true }),
    );
  });

  it('names the dialog it is inside', async () => {
    render(
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>
          <PopoverHeading>Share this page</PopoverHeading>
        </PopoverContent>
      </Popover>,
    );

    // Opened first, on purpose: a closed popover is `display: none`, and a name
    // is not computed for an element that is not rendered — which is also why
    // the assertion is worth making at all.
    await browser.click(screen.getByRole('button', { name: 'Share' }));

    // A `role="dialog"` with no accessible name is announced as "dialog" and
    // nothing else — this is the part's whole reason to exist.
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Share this page');
    expect(
      screen.getByRole('heading', { name: 'Share this page', hidden: true }),
    ).toHaveProperty('tagName', 'H2');
  });

  it('takes the level the page needs', () => {
    render(
      <Popover>
        <PopoverContent>
          <PopoverHeading as="h3">Nested</PopoverHeading>
        </PopoverContent>
      </Popover>,
    );
    expect(
      screen.getByRole('heading', { name: 'Nested', hidden: true }),
    ).toHaveProperty('tagName', 'H3');
  });
});
