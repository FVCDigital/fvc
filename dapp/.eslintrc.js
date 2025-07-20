module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: [
    'atomic',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    'atomic/no-raw-tags-outside-atomic': 'error',
    'atomic/no-inline-tailwind-outside-atomic': 'error',
  },
  overrides: [
    {
      files: ['src/components/atomic/**/*', 'src/components/ui/**/*'],
      rules: {
        'atomic/no-raw-tags-outside-atomic': 'off',
        'atomic/no-inline-tailwind-outside-atomic': 'off',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
}; 