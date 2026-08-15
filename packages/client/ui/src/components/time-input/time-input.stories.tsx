import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimeInput } from './time-input.component.js';
import { Field } from '../field/field.component.js';
import { Time } from '../time/time.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { CivilTime } from '../../date/civil-time.types.js';

const meta = {
  title: 'Components/Inputs/TimeInput',
  component: TimeInput,
  parameters: {
    docs: {
      description: {
        component:
          'One text field that shows a time in the hour cycle the design system’s locale reads, and stores it as `HH:mm`. Composes like `Input`: name it with a `Field`, or reach for `FormTimeInput`.',
      },
    },
  },
} satisfies Meta<typeof TimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field label="Opens at">
      <TimeInput name="opens" defaultValue="09:00" />
    </Field>
  ),
};

/**
 * THE POINT OF THE COMPONENT, in one screen: the same `14:30` under four
 * locales, each beside the `Time` that renders it.
 *
 * The two agree in every row. A native `input[type=time]` draws `14:30` in all
 * four — it follows the operating system, not even the locale the engine
 * reports — so under `en-US` it would sit beside a `Time` reading `02:30 PM`
 * and disagree with it on the same page.
 */
export const AcrossLocales: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}>
      {[
        { locale: 'en-US', label: 'Opens at' },
        { locale: 'it', label: 'Apre alle' },
        { locale: 'ja-JP', label: '開店時刻' },
        { locale: 'ar-EG', label: 'يفتح الساعة' },
      ].map(({ locale, label }) => (
        <UiProvider key={locale} adapters={{ i18n: { locale } }}>
          <div
            style={{
              display: 'grid',
              gap: 'var(--fm-space-inline-m)',
              gridTemplateColumns: '1fr auto',
              alignItems: 'end',
            }}
          >
            <Field label={`${label} — ${locale}`}>
              <TimeInput name="opens" defaultValue="14:30" />
            </Field>
            <Time
              value="2026-08-12T14:30:00Z"
              format="time"
              timeStyle="short"
              timeZone="UTC"
            />
          </div>
        </UiProvider>
      ))}
    </div>
  ),
};

/**
 * Empty, so each locale's placeholder shows the shape it expects — including
 * the two words the day period may become, which are the very strings the field
 * will accept.
 */
export const Placeholders: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}>
      {['en-US', 'it', 'ja-JP', 'ar-EG', 'ko-KR'].map((locale) => (
        <UiProvider key={locale} adapters={{ i18n: { locale } }}>
          <Field label={locale}>
            <TimeInput name="opens" />
          </Field>
        </UiProvider>
      ))}
    </div>
  ),
};

/**
 * TWELVE-HOUR, TYPED. `0`,`2`,`3`,`0` fills the digits and the field says what
 * is still missing; `p` finishes it.
 *
 * Nothing is assumed: `02:30` with an unspoken AM would be a wrong-but-valid
 * value, so until the half of the day is chosen the field names no time at all
 * and `onTimeChange` reports `null`.
 */
export const TheHalfOfTheDay: Story = {
  render: function Render() {
    const [time, setTime] = useState<CivilTime | null>(null);
    return (
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
        <UiProvider adapters={{ i18n: { locale: 'en-US' } }}>
          <Field label="Opens at" hint="Try 0230, then p">
            <TimeInput name="opens" onTimeChange={setTime} />
          </Field>
        </UiProvider>
        <output style={{ font: 'var(--fm-type-body-s)' }}>
          {time === null
            ? 'names no time yet'
            : `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`}
        </output>
      </div>
    );
  },
};

/**
 * The cycle can be forced where the locale cannot know it — a timetable, a
 * roster, a hospital chart that reads twenty-four-hour whatever the page's
 * language is.
 */
export const ForcedCycle: Story = {
  render: () => (
    <UiProvider adapters={{ i18n: { locale: 'en-US' } }}>
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}>
        <Field label="Departs — the locale's own cycle">
          <TimeInput name="a" defaultValue="14:30" />
        </Field>
        <Field label="Departs — forced h23">
          <TimeInput name="b" defaultValue="14:30" hourCycle="h23" />
        </Field>
      </div>
    </UiProvider>
  ),
};

/** Seconds, when the answer was given to the second. */
export const WithSeconds: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}>
      <Field label="Lap time" hint="Stored as HH:mm:ss">
        <TimeInput name="lap" precision="second" defaultValue="00:02:47" />
      </Field>
      <Field label="Opens at" hint="Stored as HH:mm">
        <TimeInput name="opens" defaultValue="09:00" />
      </Field>
    </div>
  ),
};

/**
 * What the form posts, which is never what the field shows: `FormData` gets
 * `HH:mm` whatever the reader's locale writes.
 */
export const WhatTheFormPosts: Story = {
  render: function Render() {
    const [posted, setPosted] = useState<string>('');
    return (
      <UiProvider adapters={{ i18n: { locale: 'en-US' } }}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setPosted(String(data.get('opens') ?? ''));
          }}
          style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}
        >
          <Field label="Opens at">
            <TimeInput name="opens" defaultValue="14:30" />
          </Field>
          <button type="submit">Submit</button>
          <output style={{ font: 'var(--fm-type-body-s)' }}>
            {posted === '' ? 'not submitted yet' : `opens=${posted}`}
          </output>
        </form>
      </UiProvider>
    );
  },
};
