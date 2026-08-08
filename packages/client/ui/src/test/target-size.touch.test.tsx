import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/button/button.component.js';
import { Input } from '../components/input/input.component.js';
import { Select } from '../components/select/select.component.js';
import { Textarea } from '../components/textarea/textarea.component.js';
import { Tabs } from '../components/tabs/tabs.component.js';
import { TabList } from '../components/tab-list/tab-list.component.js';
import { Tab } from '../components/tab/tab.component.js';
import { TabPanel } from '../components/tab-panel/tab-panel.component.js';
import { Checkbox } from '../components/checkbox/checkbox.component.js';
import { Radio } from '../components/radio/radio.component.js';

/**
 * THE TARGET-SIZE POLICY, in one place because it belongs to the family rather
 * than to any one component.
 *
 * 44px is what the platform guidelines ask for and what this design system's
 * own `lg` already measures; the rows in a menu, a nav and a menubar have said
 * so since they shipped. The controls had not — measured at 36px — and raising
 * only one of them is worse than raising none: `InputGroup` centres its
 * children rather than stretching them, so a button that grew alone sat taller
 * than the field beside it.
 *
 * The two the browser draws are deliberately NOT here. A native checkbox and
 * radio are painted by the OS at its own size, and this package does not take
 * `appearance` off them (see `checkbox.module.css`) — so their target is the
 * platform's business, and their LABEL, which is what a finger actually hits,
 * is the consumer's box rather than ours.
 */
const TAP = 44;

describe('every control this package draws, under a coarse pointer', () => {
  it('gives a finger 44px, whatever size it was asked for', () => {
    render(
      <>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Input aria-label="Text" size="md" />
        <Select aria-label="Choice" size="md">
          <option>One</option>
        </Select>
        <Textarea aria-label="Notes" size="md" />
        <Tabs>
          <TabList aria-label="Sections">
            <Tab value="one">One</Tab>
          </TabList>
          <TabPanel value="one">First</TabPanel>
        </Tabs>
      </>,
    );

    for (const control of [
      screen.getByRole('button', { name: 'Small' }),
      screen.getByRole('button', { name: 'Medium' }),
      screen.getByRole('textbox', { name: 'Text' }),
      screen.getByRole('combobox', { name: 'Choice' }),
      screen.getByRole('textbox', { name: 'Notes' }),
      screen.getByRole('tab', { name: 'One' }),
    ]) {
      expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        TAP,
      );
    }
  });

  it('leaves the ones the browser paints to the browser', () => {
    render(
      <>
        <Checkbox aria-label="Agree" />
        <Radio aria-label="One" name="g" />
      </>,
    );
    // Not an omission: with the native rendering kept, the box is the OS's and
    // growing it here would draw a stretched control rather than a bigger one.
    // Recorded so the next reader does not "fix" it.
    for (const control of [
      screen.getByRole('checkbox'),
      screen.getByRole('radio'),
    ]) {
      expect(control.getBoundingClientRect().height).toBeLessThan(TAP);
    }
  });
});
