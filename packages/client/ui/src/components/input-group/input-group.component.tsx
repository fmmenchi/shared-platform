import { cn } from '../../util/cn.js';
import type { InputGroupProps } from './input-group.types.js';
import styles from './input-group.module.css';

/**
 * Puts content inside a field's border — a search icon, a currency prefix, a clear
 * button — around a control that stays a plain, transparent child.
 *
 * It is a row with the field's chrome on it, and nothing else: no wrapper per
 * child, no state of its own, no JavaScript. What you put beside the control is
 * yours, and the control keeps its own height, padding and type scale, so a field
 * inside a group lines up with one outside it.
 *
 * @example
 * <InputGroup>
 *   <SearchIcon aria-hidden="true" />
 *   <Input placeholder="Search" />
 * </InputGroup>
 */
function InputGroup(props: InputGroupProps) {
  const { className, ...rest } = props;
  return <div className={cn(styles.group, className)} {...rest} />;
}

export { InputGroup };
