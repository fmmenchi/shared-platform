import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Pagination } from './pagination.component.js';
import { usePagination } from './use-pagination.js';
import { Table } from '../table/table.component.js';
import type { Column } from '../table/table.types.js';

interface Person {
  id: string;
  name: string;
  city: string;
}

const people: Person[] = Array.from({ length: 95 }, (_, index) => ({
  id: String(index + 1),
  name: `Persona ${index + 1}`,
  city: ['Aosta', 'Milano', 'Zurigo'][index % 3] as string,
}));

const columns: Column<Person>[] = [
  { key: 'name', header: 'Nome', rowHeader: true },
  { key: 'city', header: 'Città' },
];

const meta: Meta<typeof Pagination> = {
  title: 'Components/Navigation/Pagination',
  component: Pagination,
  argTypes: {
    page: {
      control: 'number',
      description: 'Which page is showing, counting from 1.',
      table: { type: { summary: 'number' } },
    },
    pageCount: {
      control: 'number',
      description:
        'How many pages there are. One page draws no pager — there is nowhere to go — and zero draws nothing rather than "page 1 of 1" over an empty list.',
      table: { type: { summary: 'number' } },
    },
    siblingCount: {
      control: 'number',
      description:
        'How many pages to draw on each side of the current one. The list’s length does not change with it: the ends expand to fill in for the gap that is not needed there.',
      table: { type: { summary: 'number' }, defaultValue: { summary: '1' } },
    },
    label: {
      control: 'text',
      description:
        'What this navigation is called. A page can hold more than one, and two landmarks called "Pagination" are two identical entries in a screen reader’s list.',
      table: { type: { summary: 'string' } },
    },
    getHref: {
      control: false,
      description:
        'Makes the pages links instead of buttons, by saying where each one lives. Pass it when the page is part of the address.',
      table: { type: { summary: '(page: number) => string' } },
    },
    onPageChange: {
      control: false,
      table: { type: { summary: '(page: number) => void' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Pagination>;

/**
 * A landmark, a list, and one control marked as the page you are on — in the
 * attribute and in words, because the paint that marks it is colour.
 *
 * Page through it and count the controls: there are always the same number.
 * The usual implementation slices an array and produces a list that grows and
 * shrinks, which moves Next under the pointer between clicks and changes a
 * keyboard reader's tab count on every press.
 */
export const Default: Story = {
  render: function Render() {
    const [page, setPage] = useState(1);
    return <Pagination page={page} pageCount={40} onPageChange={setPage} />;
  },
};

/**
 * Wider shoulders. `siblingCount` decides how many pages sit either side of the
 * current one — and the list stays the same length at every page, because the
 * end that needs no gap lengthens its run instead.
 */
export const WiderRange: Story = {
  render: function Render() {
    const [page, setPage] = useState(20);
    return (
      <Pagination
        page={page}
        pageCount={40}
        siblingCount={2}
        onPageChange={setPage}
      />
    );
  },
};

/**
 * When the page is part of the address, the pages are LINKS: they can be opened
 * in a new tab, bookmarked and reached with the browser's own back button, none
 * of which a button offers.
 *
 * The steps at the ends stay controls, because there is no address for the page
 * before the first and a link to nowhere is worse than a control that says it
 * cannot be used.
 */
export const AsLinks: Story = {
  args: {
    page: 3,
    pageCount: 12,
    getHref: (page: number) => `?page=${page}`,
  },
};

/**
 * What it is actually for. `usePagination` slices the rows and `Table` draws the
 * pager BELOW them, named after the caption — a reader tabbing forward reaches
 * it after the data, which is when "somewhere else" becomes the question.
 *
 * That is the reverse of the toolbar, which describes what you are about to
 * read and therefore comes first.
 */
export const InATable: Story = {
  render: function Render() {
    const pages = usePagination(people, { defaultPageSize: 10 });

    return (
      <Table
        caption="Persone"
        rows={pages.rows}
        getRowId={(p) => p.id}
        columns={columns}
        {...pages.props}
      />
    );
  },
};
