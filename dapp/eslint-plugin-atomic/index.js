module.exports = {
  rules: {
    'no-raw-tags-outside-atomic': require('./lib/rules/no-raw-tags-outside-atomic'),
    'no-inline-tailwind-outside-atomic': require('./lib/rules/no-inline-tailwind-outside-atomic'),
  },
}; 