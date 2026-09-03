import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/button/button.component.js';
import { Input } from '../components/input/input.component.js';
import { Select } from '../components/select/select.component.js';
import { Combobox } from '../components/combobox/combobox.component.js';
import { Textarea } from '../components/textarea/textarea.component.js';
import { Tabs } from '../components/tabs/tabs.component.js';
import { TabList } from '../components/tab-list/tab-list.component.js';
import { Tab } from '../components/tab/tab.component.js';
import { TabPanel } from '../components/tab-panel/tab-panel.component.js';
import { Checkbox } from '../components/checkbox/checkbox.component.js';
import { Radio } from '../components/radio/radio.component.js';
import { Slider } from '../components/slider/slider.component.js';
import { Switch } from '../components/switch/switch.component.js';
import { Toggle } from '../components/toggle/toggle.component.js';
import { Table } from '../components/table/table.component.js';
import { Breadcrumb } from '../components/breadcrumb/breadcrumb.component.js';
import { BreadcrumbLink } from '../components/breadcrumb-link/breadcrumb-link.component.js';
import { Calendar } from '../components/calendar/calendar.component.js';
import { Tag } from '../components/tag/tag.component.js';
import { TagList } from '../components/tag-list/tag-list.component.js';

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
 *
 * THAT SECOND HALF STOPPED BEING TRUE when `Table` grew a selection column: we
 * draw that checkbox and the cell around it, and there is no consumer label to
 * enlarge the target. It is still conformant — WCAG 2.5.8 is met through the
 * 24px-circle SPACING exception, since a row is 36px tall and the neighbouring
 * control is far enough away — but it is met by geometry rather than by size,
 * so a denser theme or a control dropped into the next cell can take it away.
 * Recorded here rather than in a component, because the exemption's stated
 * reason is what changed.
 */
const TAP = 44;

describe('every control this package draws, under a coarse pointer', () => {
  it('gives a finger 44px, whatever size it was asked for', () => {
    render(
      <>
        <Calendar defaultMonth={{ year: 2026, month: 8, day: 1 }} />
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Input aria-label="Text" size="md" />
        {/* Drawn by us, labelled EXTERNALLY (htmlFor) — so unlike Switch there
            is no wrapping label to lend the row its height, and the input box
            itself must give the finger the 44px. The 6px track stays a line;
            it is the box that grows. */}
        <Slider aria-label="Volume" />
        <Select aria-label="Choice" size="md">
          <option>One</option>
        </Select>
        {/* The control the package draws entirely itself, and therefore the one
            with nothing native underneath to fall back on. Its rows get the
            44px in its own touch file; this is the FIELD, which takes it from
            the shared `control-md` utility like the three above. */}
        <Combobox
          aria-label="City"
          size="md"
          items={[{ id: '1', name: 'Milano' }]}
          getKey={(city) => city.id}
          getLabel={(city) => city.name}
        />
        <Textarea aria-label="Notes" size="md" />
        <Tabs>
          <TabList aria-label="Sections">
            <Tab value="one">One</Tab>
          </TabList>
          <TabPanel value="one">First</TabPanel>
        </Tabs>
        {/* Composes Button, so it inherits the rule rather than restating it —
            which is exactly why it is asserted here: the day someone gives
            Toggle its own box, this is what notices. */}
        <Toggle size="sm">Toggle</Toggle>
        {/* And the one that DOES give the button its own box: the sort trigger
            restates width, padding and font from another folder's stylesheet,
            which is precisely the shape this file exists to catch. It leaves
            `height` alone, and that is the claim being checked. */}
        <Table
          caption="Persone"
          rows={[{ id: '1', name: 'Zurigo' }]}
          getRowId={(p) => p.id}
          columns={[{ key: 'name', header: 'Sortable', sortable: true }]}
          onSortToggle={() => undefined}
        />
        {/* A crumb is an inline text link everywhere else — under a coarse
            pointer its own stylesheet promises the same 44px row every other
            copy of this policy makes, and this file is where the copies are
            held together. */}
        <Breadcrumb>
          <BreadcrumbLink href="#crumb">Crumb</BreadcrumbLink>
        </Breadcrumb>
        {/* The remove control composes `Button size="sm"`, so it inherits this
            rule rather than restating it — and that is exactly why it belongs
            in this list: the inheritance is what a well-meant `height` in
            `tag.module.css` would silently take away, and the tag's own source
            claims membership here in as many words. */}
        <TagList label="Tags">
          <Tag onRemove={() => undefined}>Milano</Tag>
        </TagList>
      </>,
    );

    for (const control of [
      screen.getByRole('button', { name: 'Small' }),
      screen.getByRole('button', { name: 'Medium' }),
      screen.getByRole('button', { name: 'Toggle' }),
      screen.getByRole('textbox', { name: 'Text' }),
      screen.getByRole('slider', { name: 'Volume' }),
      screen.getByRole('combobox', { name: 'Choice' }),
      screen.getByRole('textbox', { name: 'Notes' }),
      screen.getByRole('tab', { name: 'One' }),
      screen.getByRole('button', { name: 'Sortable' }),
      screen.getByRole('link', { name: 'Crumb' }),
      screen.getByRole('button', { name: 'Remove Milano' }),
      // A day in the calendar grid. It restates the coarse-pointer rule in its
      // own stylesheet, which is the drift this file exists to catch — 42 of
      // them per month, and every one is a target.
      //
      // Reached by its attribute rather than by its accessible name, which is a
      // whole date in the reader's locale: this file renders without a provider,
      // so the name would be whatever locale the machine running the suite
      // happens to have.
      document.querySelector('[data-day="2026-08-12"]') as HTMLElement,
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

  it('sizes the switch by the row it sits in, not by the 44px rule', () => {
    render(
      <label>
        <Switch /> Notifications
      </label>,
    );

    // THE THIRD CASE, and it belongs to neither of the two above. We DO draw
    // this one, so the "leave it to the OS" reason does not apply — but it is
    // labelled the way a checkbox is, nested in a `<label>`, and the finger
    // hits the row. Stretched to 44px tall it would stop reading as a switch
    // and start reading as a pill, which is the shape this package gives to a
    // control that submits nothing.
    //
    // So the number it must clear on its own is WCAG 2.5.8's 24px minimum, not
    // AAA's 44 — and it does, where `Checkbox` at 18px does not and relies on
    // its label entirely.
    const box = screen.getByRole('switch').getBoundingClientRect();
    expect(box.height).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeLessThan(TAP);
    expect(box.width).toBeGreaterThanOrEqual(TAP);
  });
});
