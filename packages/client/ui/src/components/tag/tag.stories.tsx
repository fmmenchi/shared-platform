import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from './tag.component.js';
import { TagList } from '../tag-list/tag-list.component.js';
import { Avatar } from '../avatar/avatar.component.js';
import { Button } from '../button/button.component.js';

const meta: Meta<typeof Tag> = {
  title: 'Components/Data display/Tag',
  component: Tag,
  subcomponents: { TagList },
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description. `TagList`'s
  // own `label` is documented on the page: a subcomponent's props do not reach
  // this table.
  argTypes: {
    children: {
      control: 'text',
      description:
        'The value on screen. Words — a string, a number, or text interpolated from them — also name the remove control: "Remove Milano".',
      table: { type: { summary: 'ReactNode' } },
    },
    onRemove: {
      control: false,
      description:
        'Take the value back. **Required** — a label you cannot remove is a `Badge`.',
      table: { type: { summary: '() => void' } },
    },
    name: {
      control: 'text',
      description:
        'The tag’s text for the remove control’s name, when the children are not words. Never drawn; blank counts as absent.',
      table: { type: { summary: 'string' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Tag>;

const CITIES = ['Milano', 'Torino', 'Napoli'];

/**
 * A set whose removals are real — components rather than render closures, so
 * the hooks are where the linter expects them and the stories stay the same
 * shape as a consumer's own code.
 */
function RemovableCities({
  initial = CITIES,
  label = 'Selected cities',
}: {
  initial?: string[];
  label?: string;
}) {
  const [cities, setCities] = useState(initial);
  return (
    <TagList label={label}>
      {cities.map((city) => (
        <Tag
          key={city}
          onRemove={() => setCities((rest) => rest.filter((c) => c !== city))}
        >
          {city}
        </Tag>
      ))}
    </TagList>
  );
}

/**
 * The common case, and it is live: remove one and the focus lands on the tag
 * that took its place — press Enter repeatedly and watch the list empty without
 * the focus ever falling to the top of the page.
 */
export const Default: Story = {
  render: () => <RemovableCities />,
};

/**
 * The set wraps rather than scrolling: a tag pushed off the side is a choice
 * the reader made and can no longer see. Long values wrap inside the pill for
 * the same reason.
 */
export const Wrapping: Story = {
  render: () => (
    <div style={{ maxWidth: '22rem' }}>
      <RemovableCities
        initial={[
          'Milano',
          'Torino',
          'Napoli',
          'Palermo',
          'Bologna',
          'Firenze',
          'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch',
        ]}
      />
    </div>
  ),
};

/**
 * Richer children need `name`: there is no string for the remove control's
 * sentence to hold, and eight buttons all called "Remove" is a list nobody can
 * navigate. It is never drawn — the same words, in the form a sentence takes.
 */
export const RichChildren: Story = {
  render: () => (
    <TagList label="Reviewers">
      <Tag name="Ada Lovelace" onRemove={() => undefined}>
        <Avatar aria-hidden="true" name="Ada Lovelace" size="sm" />
        Ada Lovelace
      </Tag>
      <Tag name="Alan Turing" onRemove={() => undefined}>
        <Avatar aria-hidden="true" name="Alan Turing" size="sm" />
        Alan Turing
      </Tag>
    </TagList>
  ),
};

function CitiesWithAnAdder() {
  const [values, setValues] = useState(['Milano']);
  const next = CITIES.find((city) => !values.includes(city));
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-s)',
        justifyItems: 'start',
      }}
    >
      <TagList label="Selected cities">
        {values.map((value) => (
          <Tag
            key={value}
            onRemove={() =>
              setValues((rest) => rest.filter((v) => v !== value))
            }
          >
            {value}
          </Tag>
        ))}
      </TagList>
      <Button
        size="sm"
        variant="secondary"
        disabled={next === undefined}
        onClick={() =>
          next !== undefined && setValues((rest) => [...rest, next])
        }
      >
        Add {next ?? '—'}
      </Button>
    </div>
  );
}

/**
 * Beside the thing that adds to it. The tag paints `Button`'s own `secondary`
 * pair, so the two read as one system under any preset.
 */
export const WithTheControlThatFillsIt: Story = {
  render: () => <CitiesWithAnAdder />,
};
