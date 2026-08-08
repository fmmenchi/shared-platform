import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion } from './accordion.component.js';
import { AccordionItem } from '../accordion-item/accordion-item.component.js';
import { AccordionTrigger } from '../accordion-trigger/accordion-trigger.component.js';
import { AccordionContent } from '../accordion-content/accordion-content.component.js';

const meta: Meta<typeof Accordion> = {
  title: 'Components/Disclosure/Accordion',
  component: Accordion,
  argTypes: {
    exclusive: {
      control: 'boolean',
      description:
        'Only one open at a time. Implemented by the platform: every item gets the same `name`, and `<details name>` closes the others itself. Off by default — the exclusive one takes away a comparison the reader may be making.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Accordion>;

const items = [
  ['Spedizione', 'Consegna in 2-3 giorni lavorativi in tutta Italia.'],
  ['Resi', 'Trenta giorni per cambiare idea, senza dare spiegazioni.'],
  ['Garanzia', 'Due anni su ogni difetto di fabbricazione.'],
] as const;

const Body = () => (
  <>
    {items.map(([title, body]) => (
      <AccordionItem key={title}>
        <AccordionTrigger>{title}</AccordionTrigger>
        <AccordionContent>{body}</AccordionContent>
      </AccordionItem>
    ))}
  </>
);

/** Independent by default: open as many as you like, keep them side by side. */
export const Default: Story = {
  render: (args) => (
    <Accordion {...args}>
      <Body />
    </Accordion>
  ),
};

/** One at a time, with no script: `exclusive` gives every item the same `name`. */
export const Exclusive: Story = {
  args: { exclusive: true },
  render: (args) => (
    <Accordion {...args}>
      <Body />
    </Accordion>
  ),
};

/** A panel open at mount. `defaultOpen` seeds it once and then lets go. */
export const OpenAtMount: Story = {
  render: () => (
    <Accordion>
      <AccordionItem defaultOpen>
        <AccordionTrigger>Aperto all&apos;avvio</AccordionTrigger>
        <AccordionContent>
          Seminato una volta sola: da qui in poi lo stato è del DOM.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem>
        <AccordionTrigger>Chiuso</AccordionTrigger>
        <AccordionContent>Contenuto.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
