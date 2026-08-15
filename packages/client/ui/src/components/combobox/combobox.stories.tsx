import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Combobox } from './combobox.component.js';

interface City {
  id: string;
  name: string;
  country: string;
}

const CITIES: City[] = [
  { id: '1', name: 'Milano', country: 'Italia' },
  { id: '2', name: 'Málaga', country: 'España' },
  { id: '3', name: 'Manchester', country: 'United Kingdom' },
  { id: '4', name: 'Torino', country: 'Italia' },
  { id: '5', name: 'Marseille', country: 'France' },
  { id: '6', name: 'München', country: 'Deutschland' },
];

const meta: Meta<typeof Combobox<City>> = {
  title: 'Components/Inputs/Combobox',
  component: Combobox,
  args: {
    items: CITIES,
    getKey: (city: City) => city.id,
    getLabel: (city: City) => city.name,
    'aria-label': 'City',
  },
  // The Props table is CURATED here (react-docgen can't derive a generic
  // component's signature) — every public prop with its type and default.
  argTypes: {
    items: {
      description:
        'The options, in your own shape. Never fetched, sorted or cached here.',
      table: { type: { summary: 'readonly T[]' } },
    },
    getKey: {
      description: "The item's stable identity — what the form submits.",
      table: { type: { summary: '(item: T) => string' } },
    },
    getLabel: {
      description:
        'The item as text: what the field reads once it is chosen, and what the default filter matches against.',
      table: { type: { summary: '(item: T) => string' } },
    },
    renderItem: {
      description:
        'The row’s contents, for options that are not a single string. Defaults to `getLabel`.',
      table: { type: { summary: '(item: T) => ReactNode' } },
    },
    filter: {
      description:
        'How the query narrows the list. **`false` turns filtering off** — for when a server already answered.',
      table: {
        type: { summary: '((item: T, query: string) => boolean) | false' },
        defaultValue: { summary: 'case- and accent-insensitive substring' },
      },
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: '`Input`’s and `Select`’s heights — 32 / 36 / 44px.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" },
      },
    },
    name: {
      description:
        'The field name. Rendered on a hidden native carrier, because the visible field holds the QUERY.',
      table: { type: { summary: 'string' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Combobox<City>>;

/** Type to narrow, arrows to walk, Enter to choose. */
export const Default: Story = {};

/**
 * Rows that are not a single string. `getLabel` still decides what the field
 * reads after a pick — a chosen row has to become text a person can edit.
 */
export const RichRows: Story = {
  args: {
    renderItem: (city) => (
      <span
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 'var(--fm-space-inline-m)',
        }}
      >
        <span>{city.name}</span>
        <span style={{ opacity: 0.6 }}>{city.country}</span>
      </span>
    ),
  },
};

/**
 * The query, the choice and the open state can all be held outside. Here the
 * page keeps the choice and shows it back — which is also how you would drive a
 * server search: hold the query, fetch on it, and pass `filter={false}` so the
 * answer is not filtered twice.
 */
/** A real component, because hooks may not live in a `render` function. */
function ControlledDemo(args: ComponentProps<typeof Combobox<City>>) {
  const [value, setValue] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const chosen = CITIES.find((city) => city.id === value);
  return (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Combobox
        {...args}
        value={value}
        onValueChange={setValue}
        query={query}
        onQueryChange={setQuery}
      />
      <p style={{ opacity: 0.7 }}>
        {chosen ? `${chosen.name} — ${chosen.country}` : 'Nothing chosen'}
      </p>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};

/**
 * A last row offering to create what was typed — an option, so the arrows reach
 * it and a screen reader announces it like any other.
 */
export const Creatable: Story = {
  args: {
    // eslint-disable-next-line no-console -- a story showing what is reported
    onCreate: (query: string) => console.log('create', query),
  },
};

/**
 * Free text, which is off by default: here the typed string is itself the
 * value, so an unmatched query still submits.
 */
export const FreeText: Story = {
  args: { freeText: true, name: 'city' },
};

/** The three heights, matching every other control on the row. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Combobox {...args} size="sm" />
      <Combobox {...args} size="md" />
      <Combobox {...args} size="lg" />
    </div>
  ),
};

/**
 * In a form it is an ordinary field: the hidden carrier is what `FormData`
 * collects, so the key goes with the rest.
 */
export const InAForm: Story = {
  render: (args) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        alert(`city = ${String(data.get('city'))}`);
      }}
      style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}
    >
      <Combobox {...args} name="city" />
      <button type="submit">Submit</button>
    </form>
  ),
};
