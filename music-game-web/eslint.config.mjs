// @ts-check
import eslint from '@eslint/js';
import { fileURLToPath } from 'node:url';
import globals from 'globals';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';
import tailwind from 'eslint-plugin-tailwindcss';

const tailwindCssEntry = fileURLToPath(new URL('./src/styles.css', import.meta.url));

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  {
    settings: {
      tailwindcss: {
        cssConfigPath: tailwindCssEntry,
        cssFiles: [tailwindCssEntry],
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
      tailwind.configs.recommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'tailwindcss/no-custom-classname': 'off',
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [...angular.configs.templateRecommended],
    languageOptions: {
      parser: angular.templateParser,
    },
    plugins: tailwind.configs.recommended.plugins,
    rules: {
      ...tailwind.configs.recommended.rules,
      'tailwindcss/no-custom-classname': 'off',
    },
  },
);
