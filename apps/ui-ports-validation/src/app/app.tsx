import { useState } from 'react';
import { UiProvider } from '@fmmenchi/ui';
import {
  SignupWithNoLibrary,
  SignupWithRhf,
} from '../screens/signup.screen.js';
import { PrefilledScreen } from '../screens/prefilled.screen.js';
import { ZodScreen } from '../screens/zod.screen.js';
import { RhfRecipeScreen } from '../screens/rhf.screen.js';
import { FormikScreen } from '../screens/formik.screen.js';
import { TanstackScreen } from '../screens/tanstack.screen.js';
import { ConformRecipeScreen } from '../screens/conform.recipe.screen.js';
import {
  useRhfField,
  useRhfErrors,
} from '@fmmenchi/ui-form-ports/react-hook-form';

const SCREENS = {
  // The four libraries, rendering the SAME fields through the same components.
  // One test suite runs against all four (recipes.test.tsx): if any of them
  // needed its own assertions, the port would be leaking.
  'recipe-rhf': {
    title: 'Recipes · react-hook-form',
    blurb:
      'Uncontrolled: it binds by name and ref and lets the DOM hold the state — the only one of the four that needs no type map.',
    render: () => <RhfRecipeScreen />,
  },
  'recipe-formik': {
    title: 'Recipes · Formik',
    blurb:
      'Controlled, and with no zod integration of its own: the schema goes through the plain validate callback. Invisible from the markup.',
    render: () => <FormikScreen />,
  },
  'recipe-tanstack': {
    title: 'Recipes · TanStack Form',
    blurb:
      'A render-prop API with no props bag to spread. The adapter builds one from the store, so the markup is byte-for-byte the others’.',
    render: () => <TanstackScreen />,
  },
  'recipe-conform': {
    title: 'Recipes · Conform',
    blurb:
      'Validates FormData, not a JS object — so a ticked box is the string "on". Its own schema, the same markup.',
    render: () => <ConformRecipeScreen />,
  },
  zod: {
    title: 'react-hook-form + zod',
    blurb:
      'The rules live in a zod schema, in the app. The design system never sees them — only the messages they produce, by field name. One line says "zod"; nothing below it knows.',
    render: () => <ZodScreen />,
  },
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
  const [screen, setScreen] = useState<ScreenKey>('zod');
  const current = SCREENS[screen];

  return (
    // The form binding is given ONCE here, like i18n or Link. Every form below
    // works with nothing further to wire.
    <UiProvider
      adapters={{
        i18n: { locale: 'en' },
        form: { field: useRhfField, errors: useRhfErrors },
      }}
    >
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
