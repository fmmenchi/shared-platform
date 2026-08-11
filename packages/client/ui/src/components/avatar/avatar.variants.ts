import { cva } from 'class-variance-authority';
import styles from './avatar.module.css';

// `cva` maps the public variant API to CSS-module class names; the styling
// lives in `avatar.module.css`. Kept out of the component file so that file
// exports only the component (React Fast Refresh requires that).
//
// ONE axis. There is no colour variant on purpose: an avatar's colour is the
// photo, and the fallback surface is the one neutral `muted` pair — a status
// ring or presence dot would be a separate concern layered by the consumer,
// not a treatment of this component.
export const avatarVariants = cva(styles.avatar, {
  variants: {
    size: {
      sm: styles.sm,
      md: styles.md,
      lg: styles.lg,
    },
  },
  defaultVariants: { size: 'md' },
});
