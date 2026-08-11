import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './avatar.component.js';

// A self-contained portrait (data URI) so stories render identically offline
// and inside the vitest smoke run — an external URL would make both flaky.
const PORTRAIT =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%235b21b6'/%3E%3Ccircle cx='40' cy='30' r='14' fill='%23ede9fe'/%3E%3Ccircle cx='40' cy='78' r='26' fill='%23ede9fe'/%3E%3C/svg%3E";
const BROKEN = '/this-image-does-not-exist.png';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Data display/Avatar',
  component: Avatar,
  args: { name: 'Ada Lovelace', size: 'md' },
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description.
  argTypes: {
    name: {
      control: 'text',
      description:
        'Accessible name AND the source of the initials fallback. Without it the avatar is decorative (hidden from assistive tech).',
      table: { type: { summary: 'string' } },
    },
    src: {
      control: 'text',
      description:
        'Image URL — the real `<img>` is always rendered when given; on failure the initials take its place.',
      table: { type: { summary: 'string' } },
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: 'Box + type scale of the circle.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" },
      },
    },
    crossOrigin: {
      control: false,
      description: 'Forwarded to the underlying `<img>` (CORS mode).',
      table: { type: { summary: "'' | 'anonymous' | 'use-credentials'" } },
    },
    referrerPolicy: {
      control: false,
      description: 'Forwarded to the underlying `<img>`.',
      table: { type: { summary: 'HTMLAttributeReferrerPolicy' } },
    },
    loading: {
      control: false,
      description: 'Forwarded to the underlying `<img>` (native lazy loading).',
      table: { type: { summary: "'eager' | 'lazy'" } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Avatar>;

/** The default control surface (drives the Props table). */
export const Default: Story = { args: { src: PORTRAIT } };

/** No image: initials derived from the name (first + last word). */
export const Initials: Story = { args: { name: 'Ada Lovelace' } };

/** The image failed to load — the initials take its place, same markup. */
export const BrokenSource: Story = {
  args: { name: 'Ada Lovelace', src: BROKEN },
};

/** No name, no image: a decorative silhouette, hidden from assistive tech. */
export const Decorative: Story = { args: { name: undefined } };

/** sm · md · lg, image and initials side by side. */
export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 'var(--fm-space-inline-s)',
        alignItems: 'center',
      }}
    >
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Avatar key={size} size={size} name="Ada Lovelace" src={PORTRAIT} />
      ))}
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Avatar key={size} size={size} name="Ada Lovelace" />
      ))}
    </div>
  ),
};
