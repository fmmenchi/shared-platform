import { it, expect } from 'vitest';
import { createRef } from 'react';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverClose } from '../popover-close/popover-close.component.js';
import { PopoverHeading } from '../popover-heading/popover-heading.component.js';
import { Button } from '../button/button.component.js';

it('types', () => {
  const buttonRef = createRef<HTMLButtonElement>();
  const anchorRef = createRef<HTMLAnchorElement>();
  const ok = (
    <>
      <PopoverTrigger variant="secondary">Share</PopoverTrigger>
      <PopoverTrigger ref={buttonRef}>Share</PopoverTrigger>
      <PopoverClose as={Button} variant="ghost">
        Done
      </PopoverClose>
      <PopoverHeading as="h3">Title</PopoverHeading>
      {/* @ts-expect-error an unknown prop must not compile */}
      <PopoverTrigger nosuchprop="x">Share</PopoverTrigger>
      {/* @ts-expect-error an invalid variant must not compile */}
      <PopoverTrigger variant="not-a-variant">Share</PopoverTrigger>
      {/* @ts-expect-error a handler of the wrong type must not compile */}
      <PopoverTrigger onClick={42}>Share</PopoverTrigger>
      {/* @ts-expect-error popovertarget works on a button and nothing else */}
      <PopoverTrigger as="a" href="/x">
        Share
      </PopoverTrigger>
      {/* @ts-expect-error the wrong ref element must not compile */}
      <PopoverTrigger ref={anchorRef}>Share</PopoverTrigger>
      {/* @ts-expect-error a dialog cannot be named by an input */}
      <PopoverHeading as="input" />
      {/* @ts-expect-error nor by a div */}
      <PopoverHeading as="div">Title</PopoverHeading>
      {/* @ts-expect-error the close is a button too */}
      <PopoverClose as="a">Done</PopoverClose>
    </>
  );
  expect(ok).toBeTruthy();
});
