import '@testing-library/jest-dom/vitest';
// Load the token theme so components render with real values (contrast, radius…),
// plus the dark preset so `[data-theme='dark']` resolves in a11y/contrast tests.
import '@fmmenchi/tokens/styles/tailwind.css';
import '@fmmenchi/tokens/styles/presets/dark.css';
