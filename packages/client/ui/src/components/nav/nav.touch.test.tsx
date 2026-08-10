import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Nav } from './nav.component.js';
import { NavGroup } from '../nav-group/nav-group.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';

/**
 * The touch form. This file runs in its OWN browser — one that reports a coarse
 * pointer — because that is the only way a media query has anything to say. In
 * the ordinary suite the browser reports `pointer: fine`, and the rows measure
 * 36px there: every assertion below would have passed for the wrong reason
 * while claiming to measure this one.
 */
const example = (orientation?: 'horizontal' | 'vertical') => (
  <Nav label="Main" orientation={orientation}>
    <NavLink href="#home">Home</NavLink>
    <NavGroup label="Products">
      <NavLink href="#tea">Tea</NavLink>
      <NavLink href="#coffee">Coffee</NavLink>
    </NavGroup>
  </Nav>
);

const group = (name: string) => screen.getByRole('button', { name });

const open = async (name: string) => {
  await browser.click(group(name));
  await waitFor(() =>
    expect(group(name)).toHaveAttribute('aria-expanded', 'true'),
  );
  const list = document.getElementById(
    group(name).getAttribute('aria-controls') as string,
  )!;
  await Promise.all(list.getAnimations().map((a) => a.finished));
  return list;
};

describe('Nav on a touch screen', () => {
  it('gives a finger something to hit, on both kinds of row', async () => {
    render(example('vertical'));
    await open('Products');

    // 44px is what the platform human-interface guidelines ask for and WCAG
    // 2.5.8's enhanced target size. The rows are full width already; only
    // their height was short — and a group's button is as much of a target as
    // a link, which the stylesheets used to say and nothing checked.
    for (const row of [
      ...screen.getAllByRole('link'),
      ...screen.getAllByRole('button'),
    ]) {
      expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });

  it('keeps the flyout on the screen it has', async () => {
    render(example('horizontal'));
    const flyout = (await open('Products')).getBoundingClientRect();

    // A phone is where a bar runs out of room first, and the geometry is what
    // keeps a panel anchored to a button near the edge from hanging off it.
    expect(flyout.left).toBeGreaterThanOrEqual(0);
    expect(flyout.right).toBeLessThanOrEqual(window.innerWidth);
    expect(flyout.bottom).toBeLessThanOrEqual(window.innerHeight);
  });
});
