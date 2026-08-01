import { cva } from 'class-variance-authority';
import styles from './tooltip.module.css';

// One class, no axis: a tooltip has a single treatment. `cva` is still the seam
// the archetype uses, so the component file exports only the component (React
// Fast Refresh requires that) and a variant can be added later without moving
// anything.
export const tooltipVariants = cva(styles.tooltip);
