import { createPartContext } from '../../primitives/part-context.js';

/**
 * Which section a part is rendering in.
 *
 * It carries exactly one fact, and that fact makes `scope` automatic: a `<th>`
 * inside `<thead>` heads a COLUMN, a `<th>` inside `<tbody>` heads a ROW. That
 * is not a convention we invented, it is what the two positions mean — so the
 * attribute nobody remembers to write can be derived instead of configured.
 *
 * `scope` is the single most consequential attribute in a table and the most
 * omitted: without it a reader landing on a cell hears "Rossi" instead of
 * "Nome: Rossi", and the table stops being a table and becomes a list of words.
 */
export type TableSection = 'head' | 'body' | 'foot';

const { Context, useFamilyContext, usePart } =
  createPartContext<TableSection>('Table');

export const TableSectionContext = Context;
export const useTableSection = useFamilyContext;
export const useTableSectionPart = usePart;
