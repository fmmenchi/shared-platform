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
  // every public prop with type summary, default and description.
  argTypes: {
    children: {
      control: 'text',
      description:
        'The value on screen. A string (or number) also names the remove control — "Remove Milano".',
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
        'The tag’s text for the remove control’s name, when the children are not a plain string. Never drawn.',
      table: { type: { summary: 'string' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Tag>;

const CITIES = ['Milano', 'Torino', 'Napoli'];

/**
 * The common case, and it is live: remove one and the focus lands on the tag
 * that took its place — press Enter repeatedly and watch the list empty without
 * the focus ever falling to the top of the page.
 */
export const Default: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- a render function is a component
    const [cities, setCities] = useState(CITIES);
    return (
      <TagList label="Selected cities">
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
  },
};

/**
 * The set WRAPS rather than scrolling: a tag pushed off the side is a choice
 * the reader made and can no longer see.
 */
export const Wrapping: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- a render function is a component
    const [values, setValues] = useState([
      'Milano',
      'Torino',
      'Napoli',
      'Palermo',
      'Bologna',
      'Firenze',
      'Cagliari',
      'Trieste',
    ]);
    return (
      <div style={{ maxWidth: '22rem' }}>
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
      </div>
    );
  },
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

/**
 * Beside the thing that adds to it. The tag is a `Button`'s `secondary` pair,
 * so the two read as one system under any preset.
 */
export const WithTheControlThatFillsIt: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- a render function is a component
    const [values, setValues] = useState(['Milano']);
    const next = CITIES.find((c) => !values.includes(c));
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
          onClick={() => next && setValues((rest) => [...rest, next])}
        >
          Add {next ?? '—'}
        </Button>
      </div>
    );
  },
};
