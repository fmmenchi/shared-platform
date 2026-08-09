import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToastRegion } from '../toast-region/toast-region.component.js';
import { useToast } from '../toast-region/toast-region.context.js';
import { Button } from '../button/button.component.js';
import { Toast } from './toast.component.js';

const meta: Meta<typeof ToastRegion> = {
  title: 'Components/Feedback/Toast',
  component: ToastRegion,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ToastRegion>;

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
          })
        }
      >
        Save
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
        Export
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
 * Raise a few. They stack, the newest nearest the edge, and each takes itself
 * away — except the error, which stays: something went wrong is not a thing to
 * skim.
 *
 * Put the pointer over the stack, or tab into it, and the clock stops.
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
 * The message itself, out of the queue — for reading the anatomy. In a product
 * this is never rendered by hand: `useToast().toast()` puts it in the region.
 */
export const OneMessage: StoryObj<typeof Toast> = {
  render: () => (
    <div style={{ padding: '2rem', maxInlineSize: '24rem' }}>
      <Toast
        id="example"
        variant="success"
        title="Saved"
        duration={0}
        paused
        onDismiss={() => undefined}
      >
        Your changes are live.
      </Toast>
    </div>
  ),
};
