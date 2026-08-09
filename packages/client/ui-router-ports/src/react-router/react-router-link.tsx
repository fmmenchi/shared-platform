import { Link } from 'react-router';
import type { ReactElement } from 'react';
import type { LinkComponent } from '@fmmenchi/ui';

/**
 * `@fmmenchi/ui`'s link port, implemented for React Router.
 *
 * The whole of it is a rename, and the rename is the reason this exists rather
 * than being a line in the docs: the port is `href`, because that is the HTML
 * attribute and the one name no router invented, while React Router navigates
 * on `to`. Handed the port's props unchanged, React Router's `Link` renders an
 * anchor with no destination — a link that looks right and goes nowhere.
 *
 * Everything else passes through, `className` and `ref` included, so the design
 * system keeps drawing the element it drew before.
 */
export const ReactRouterLink: LinkComponent = ({
  href,
  ...rest
}): ReactElement => <Link to={href} {...rest} />;
