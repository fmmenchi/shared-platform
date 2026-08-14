import { cva } from 'class-variance-authority';
import styles from './calendar.module.css';

/**
 * No axes yet, and a `cva` call with none is still the right shape: the
 * component's class comes from one place, and the day a size or a density lands
 * it lands here rather than in a `cn` at the call site.
 */
export const calendarVariants = cva(styles.calendar);
