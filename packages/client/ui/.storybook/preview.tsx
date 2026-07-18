import { definePreview } from '@storybook/react-vite';
import addonDocs from '@storybook/addon-docs';
import addonA11y from '@storybook/addon-a11y';
import { UiProvider } from '../src/i18n/provider.js';
import '@fmmenchi/tokens/styles/tailwind.css';
import '@fmmenchi/tokens/styles/presets/dark.css';

const preview = definePreview({
  addons: [addonDocs(), addonA11y()],
  globalTypes: {
    // Drives the design-token `data-theme` on the root; the tokens define a
    // `[data-theme='dark']` override.
    theme: {
      description: 'Design-token theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
      },
    },
    // Drives the DS micro-copy locale AND text direction: the provider derives
    // `dir` from the locale (`ar` → rtl), so this one control exercises i18n.
    locale: {
      description: 'DS locale (copy + text direction)',
      defaultValue: 'en',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        dynamicTitle: true,
        items: [
          { value: 'en', title: 'English (LTR)' },
          { value: 'it', title: 'Italiano (LTR)' },
          { value: 'ar', title: 'العربية (RTL)' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals['theme'] as string) ?? 'light';
      const locale = (context.globals['locale'] as string) ?? 'en';
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.style.backgroundColor = 'var(--fm-color-bg)';
        document.body.style.color = 'var(--fm-color-fg)';
      }
      return (
        <UiProvider adapters={{ i18n: { locale } }}>
          <Story />
        </UiProvider>
      );
    },
  ],
  parameters: {
    backgrounds: { disable: true },
    // axe runs on every story; any WCAG violation fails the a11y check.
    a11y: { test: 'error' },
    // The DS's declared viewports (mobile-first): preview each device class.
    viewport: {
      options: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
        tablet: {
          name: 'Tablet (≥768)',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop (≥1024)',
          styles: { width: '1280px', height: '800px' },
        },
      },
    },
  },
});

export default preview;
