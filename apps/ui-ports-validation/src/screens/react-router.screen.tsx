import { MemoryRouter, Route, Routes } from 'react-router';
import { UiProvider } from '@fmmenchi/ui';
import { reactRouterAdapters } from '@fmmenchi/ui-router-ports/react-router';
import {
  Menu,
  PATHS,
  Resolved,
  type RouterScreenProps,
} from './router.shared.js';

/** The menu under React Router, wired exactly as the README says to wire it. */
export function ReactRouterScreen({ at, basename }: RouterScreenProps) {
  return (
    <MemoryRouter
      basename={basename}
      initialEntries={[`${basename ?? ''}${at}`]}
    >
      <UiProvider adapters={{ i18n: { locale: 'en' }, ...reactRouterAdapters }}>
        <Menu />
        {/* A real route tree, so `useResolvedPath` has something to resolve
            against rather than answering from an empty router. */}
        <Routes>
          {PATHS.map((path) => (
            <Route key={path} path={path} element={<Resolved path={path} />} />
          ))}
        </Routes>
      </UiProvider>
    </MemoryRouter>
  );
}
