// ESLint 9+ flat config: Only custom atomic rules enabled for now.
// Add recommended, React, and TypeScript configs when flat config support is available.

module.exports = [
  {
    plugins: {
      '@fvc/atomic': require('./eslint-plugin-atomic'),
    },
    rules: {
      '@fvc/atomic/no-raw-tags-outside-atomic': 'error',
      '@fvc/atomic/no-inline-tailwind-outside-atomic': 'error',
    },
  },
  {
    files: ['src/components/atomic/**/*', 'src/components/ui/**/*'],
    rules: {
      '@fvc/atomic/no-raw-tags-outside-atomic': 'off',
      '@fvc/atomic/no-inline-tailwind-outside-atomic': 'off',
    },
  },
]; 