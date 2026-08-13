import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateInput } from './date-input.component.js';
import { Field } from '../field/field.component.js';
import { Button } from '../button/button.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { CivilDate } from '../../date/civil-date.types.js';

const meta = {
  title: 'Components/Inputs/DateInput',
  component: DateInput,
  parameters: {
    docs: {
      description: {
        component:
          'One text field that shows a date the way the design system’s locale writes it, and stores it as ISO. Composes like `Input`: name it with a `Field`, or reach for `FormDateInput`.',
      },
    },
  },
} satisfies Meta<typeof DateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field label="Date of birth">
      <DateInput name="dob" defaultValue="1985-03-12" />
    </Field>
  ),
};

/**
 * THE POINT OF THE COMPONENT, in one screen: the same ISO date — `2026-08-12` —
 * under four locales.
 *
 * The order moves, the separator moves, the hint letters move, and the value
 * stored underneath never does. A native `input[type=date]` renders identically
 * in all four, in whatever order the operating system prefers.
 */
export const AcrossLocales: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}>
      {[
        { locale: 'it', label: 'Data di nascita' },
        { locale: 'en-US', label: 'Date of birth' },
        { locale: 'ja-JP', label: '生年月日' },
        { locale: 'ar', label: 'تاريخ الميلاد' },
      ].map(({ locale, label }) => (
        <UiProvider key={locale} adapters={{ i18n: { locale } }}>
          <Field label={`${label} — ${locale}`}>
            <DateInput name="dob" defaultValue="2026-08-12" />
          </Field>
        </UiProvider>
      ))}
    </div>
  ),
};

/** Empty, so the placeholder shows the format each locale expects. */
export const TheFormatHint: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}>
      {['it', 'en-US', 'en-GB', 'ja-JP'].map((locale) => (
        <UiProvider key={locale} adapters={{ i18n: { locale } }}>
          <Field label={locale}>
            <DateInput name={`dob-${locale}`} />
          </Field>
        </UiProvider>
      ))}
    </div>
  ),
};

/** The value as the consumer receives it: a day, never a `Date`. */
export const ReadingTheValue: Story = {
  render: function ReadingTheValueStory() {
    const [date, setDate] = useState<CivilDate | null>(null);
    return (
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
        <Field
          label="Departure"
          hint="Type it however you like: / - . or a space."
        >
          <DateInput name="departure" onDateChange={setDate} />
        </Field>
        <output
          style={{ font: 'var(--fm-font-mono, monospace)', opacity: 0.7 }}
        >
          {date === null ? 'null' : JSON.stringify(date)}
        </output>
      </div>
    );
  },
};

/**
 * One name in `FormData`, holding ISO — not the text on screen — and
 * `form.reset()` puts it back. The two properties the hidden carrier exists for.
 */
export const InAForm: Story = {
  render: function InAFormStory() {
    const [posted, setPosted] = useState<string>('—');
    return (
      <UiProvider adapters={{ i18n: { locale: 'it' } }}>
        <form
          style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setPosted(JSON.stringify(Object.fromEntries(data)));
          }}
        >
          <Field label="Data di nascita">
            <DateInput name="dob" defaultValue="1985-03-12" />
          </Field>
          <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
            <Button type="submit">Invia</Button>
            <Button type="reset" variant="secondary">
              Azzera
            </Button>
          </div>
          <output
            style={{ font: 'var(--fm-font-mono, monospace)', opacity: 0.7 }}
          >
            {posted}
          </output>
        </form>
      </UiProvider>
    );
  },
};

/** The sizes are `Input`'s, because this is an `Input`. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Field key={size} label={size}>
          <DateInput name={`dob-${size}`} size={size} />
        </Field>
      ))}
    </div>
  ),
};
