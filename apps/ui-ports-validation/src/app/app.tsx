import { useState } from 'react';
import { UiProvider } from '@fmmenchi/ui';
import {
  SignupWithNoLibrary,
  SignupWithRhf,
} from '../screens/signup.screen.js';
import { PrefilledScreen } from '../screens/prefilled.screen.js';

const SCREENS = {
  rhf: {
    title: 'react-hook-form',
    blurb:
      'The library owns validation, submission and values. The adapter is twelve lines that read them.',
    render: () => <SignupWithRhf />,
  },
  none: {
    title: 'No form library',
    blurb:
      'The same fields, bound to a dozen lines of useState. If this behaves differently, the components are not really agnostic.',
    render: () => <SignupWithNoLibrary />,
  },
  late: {
    title: 'Data arriving late',
    blurb:
      'The edit case: the record comes from a fetch after the fields are on screen. useForm({ values }), never a reset() in an effect.',
    render: () => <PrefilledScreen />,
  },
} as const;

type ScreenKey = keyof typeof SCREENS;

export function App() {
  const [screen, setScreen] = useState<ScreenKey>('rhf');
  const current = SCREENS[screen];

  return (
    <UiProvider adapters={{ i18n: { locale: 'en' } }}>
      <main className="page">
        <header className="head">
          <h1>UI ports — validation</h1>
          <p>
            The same form, rendered through the same design-system components,
            bound differently each time. Nothing below the adapter names a form
            library.
          </p>
        </header>

        <nav className="tabs" aria-label="Binding">
          {(Object.keys(SCREENS) as ScreenKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className="tab"
              aria-current={key === screen ? 'page' : undefined}
              onClick={() => setScreen(key)}
            >
              {SCREENS[key].title}
            </button>
          ))}
        </nav>

        <section className="panel" aria-label={current.title}>
          <p className="blurb">{current.blurb}</p>
          {current.render()}
        </section>
      </main>
    </UiProvider>
  );
}

export default App;
