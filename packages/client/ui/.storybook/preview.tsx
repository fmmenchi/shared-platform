import { definePreview } from '@storybook/react-vite';
import addonDocs from '@storybook/addon-docs';
import addonA11y from '@storybook/addon-a11y';
import { UiProvider } from '../src/i18n/provider.js';
import '@fmmenchi/tokens/styles/tailwind.css';
import '@fmmenchi/tokens/styles/presets/alt.css';

const preview = definePreview({
  addons: [addonDocs(), addonA11y()],
  globalTypes: {
    theme: {
      description: 'Design-token preset',
      defaultValue: 'base',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: [
          { value: 'base', title: 'Base', icon: 'sun' },
          { value: 'alt', title: 'Alt', icon: 'moon' },
        ],
      },
    },
    locale: {
      description: 'DS micro-copy locale',
      defaultValue: 'en',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        dynamicTitle: true,
        items: [
          { value: 'en', title: 'English' },
          { value: 'it', title: 'Italiano' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals['theme'] as string) ?? 'base';
      const locale = (context.globals['locale'] as string) ?? 'en';
      if (typeof document !== 'undefined') {
        document.body.style.backgroundColor = 'var(--fm-color-bg)';
        document.body.style.color = 'var(--fm-color-fg)';
      }
      return (
        <UiProvider adapters={{ i18n: { locale } }} theme={theme}>
          <Story />
        </UiProvider>
      );
    },
  ],
});

export default preview;
