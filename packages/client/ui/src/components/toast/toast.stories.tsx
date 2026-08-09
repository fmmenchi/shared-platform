import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToastRegion } from '../toast-region/toast-region.component.js';
import { useToast } from '../toast-region/toast-region.context.js';
import { Button } from '../button/button.component.js';

const meta: Meta<typeof ToastRegion> = {
  title: 'Components/Feedback/Toast',
  component: ToastRegion,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ToastRegion>;

const TwoShapes = () => {
  const api = useToast();
  return (
    <div style={{ display: 'flex', gap: '0.5rem', padding: '2rem' }}>
      <Button
        onClick={() =>
          api?.toast({
            variant: 'info',
            title: 'Stays',
            children: 'Until you dismiss it. Note the ✕.',
          })
        }
      >
        Raise one that stays
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          api?.toast({
            variant: 'success',
            title: 'Goes',
            children: 'In six seconds, and offers no control.',
            duration: 6000,
          })
        }
      >
        Raise a timed one
      </Button>
    </div>
  );
};

const Raise = () => {
  const api = useToast();
  return (
    <div style={{ display: 'flex', gap: '0.5rem', padding: '2rem' }}>
      <Button
        onClick={() =>
          api?.toast({
            variant: 'success',
            title: 'Saved',
            children: 'Your changes are live.',
            // TIMED, so it carries no way out — there is nothing to reach.
            duration: 6000,
          })
        }
      >
        Save (timed)
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          api?.toast({
            variant: 'info',
            title: 'Export started',
            children: 'We will email you when it is ready.',
          })
        }
      >
        Export (stays)
      </Button>
      <Button
        variant="destructive"
        onClick={() =>
          api?.toast({
            variant: 'error',
            title: 'Could not save',
            children: 'The connection dropped. Nothing was lost.',
          })
        }
      >
        Fail
      </Button>
    </div>
  );
};

/**
 * Raise a few. They stack **newest first**, and a message stays until it is
 * dismissed unless it was given a `duration`.
 *
 * Note which ones have a ✕: only the ones that stay. A message that leaves on
 * its own offers no control, because six seconds is not enough to reach one —
 * the region renders after the whole app, so its controls are last in the tab
 * order.
 *
 * Put the pointer over a timed one and its clock stops while you read it.
 */
export const Default: Story = {
  render: (args) => (
    <ToastRegion {...args}>
      <Raise />
    </ToastRegion>
  ),
};

/** The stack can sit at any edge; `block-end` is the default. */
export const TopEdge: Story = {
  args: { placement: 'block-start' },
  render: (args) => (
    <ToastRegion {...args}>
      <Raise />
    </ToastRegion>
  ),
};

/**
 * The two shapes side by side, which is the whole design in one screen.
 *
 * The one that **stays** carries a ✕ — nothing is racing you to it. The one
 * with a `duration` carries none, because six seconds is not enough to reach a
 * control that sits after the entire page in the tab order.
 */
export const StayingAndTimed: Story = {
  render: (args) => (
    <ToastRegion {...args}>
      <TwoShapes />
    </ToastRegion>
  ),
};
