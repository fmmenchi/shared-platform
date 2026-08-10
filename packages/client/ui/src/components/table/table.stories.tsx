import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table } from './table.component.js';
import { TableBody } from '../table-body/table-body.component.js';
import { TableCell } from '../table-cell/table-cell.component.js';
import { TableHead } from '../table-head/table-head.component.js';
import { TableHeaderCell } from '../table-header-cell/table-header-cell.component.js';
import { TableRow } from '../table-row/table-row.component.js';
import type { Column } from './table.types.js';

interface Person {
  id: string;
  name: string;
  city: string;
  age: number;
}

const people: Person[] = [
  { id: '1', name: 'Àlice Rossi', city: 'Aosta', age: 34 },
  { id: '2', name: 'Bruno Conti', city: 'Milano', age: 9 },
  { id: '3', name: 'Carla Neri', city: 'Zurigo', age: 41 },
];

const columns: Column<Person>[] = [
  { key: 'name', header: 'Nome', rowHeader: true },
  { key: 'city', header: 'Città' },
  { key: 'age', header: 'Età', align: 'end' },
];

const meta: Meta<typeof Table<Person>> = {
  title: 'Components/Data display/Table',
  component: Table,
  // The Props table is CURATED here (react-docgen can't derive it).
  argTypes: {
    caption: {
      control: 'text',
      description:
        'What the table is, as a real `<caption>`. Required: assistive technology lists the tables on a page, and without a name they are identical entries.',
      table: { type: { summary: 'ReactNode' } },
    },
    density: {
      control: 'inline-radio',
      options: ['comfortable', 'compact'],
      description: 'How much air a row gets.',
      table: { type: { summary: "'comfortable' | 'compact'" } },
    },
    busy: {
      control: 'boolean',
      description:
        'Something is arriving. Describes the element, not where the data comes from — a background refetch is busy while the old rows are still on screen.',
      table: { type: { summary: 'boolean' } },
    },
    columns: { control: false, table: { type: { summary: 'Column<T>[]' } } },
    rows: { control: false, table: { type: { summary: 'readonly T[]' } } },
  },
};
export default meta;

type Story = StoryObj<typeof Table<Person>>;

/**
 * The columns are declared, not written as markup — which is what makes the
 * header and the body impossible to disagree with each other.
 *
 * Free here: `scope="col"` on every header, `scope="row"` on the name column
 * (it is `rowHeader`), the caption as the table's accessible name, and the
 * numeric column right-aligned with tabular figures — declared once, not
 * repeated on every cell.
 */
export const Default: Story = {
  args: {
    caption: 'Persone',
    rows: people,
    columns,
    getRowId: (p: Person) => p.id,
  },
};

/** Same table, tighter rows. */
export const Compact: Story = {
  args: {
    caption: 'Persone',
    rows: people,
    columns,
    getRowId: (p: Person) => p.id,
    density: 'compact',
  },
};

/**
 * With no rows the body carries one cell spanning the whole table — and the
 * `colSpan` is counted from the column list, not typed by hand, so it cannot be
 * wrong the day a column is added.
 */
export const Empty: Story = {
  args: {
    caption: 'Persone',
    rows: [],
    columns,
    getRowId: (p: Person) => p.id,
    empty: 'Nessuna persona trovata.',
  },
};

/**
 * `busy` while something is arriving. The rows stay on screen — which is the
 * point: it says "there is more coming", not "there is nothing yet".
 */
export const Busy: Story = {
  args: {
    caption: 'Persone',
    rows: people,
    columns,
    getRowId: (p: Person) => p.id,
    busy: true,
  },
};

/**
 * The parts, for a layout the column model cannot express — here a footer with
 * a total. Dropping to them is decomposition, not a second component: the same
 * relationship `Field` has to `FormInput`.
 */
export const Composed: Story = {
  render: () => (
    <Table caption="Persone">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Nome</TableHeaderCell>
          <TableHeaderCell align="end">Età</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {people.map((p) => (
          <TableRow key={p.id}>
            <TableHeaderCell>{p.name}</TableHeaderCell>
            <TableCell align="end">{p.age}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
