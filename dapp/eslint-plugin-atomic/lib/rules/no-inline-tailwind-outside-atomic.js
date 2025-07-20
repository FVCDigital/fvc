const path = require('path');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow inline Tailwind className/class props outside components/ui and components/atomic',
      category: 'Best Practices',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename();
    const isAllowed =
      filename.includes(`${path.sep}components${path.sep}ui${path.sep}`) ||
      filename.includes(`${path.sep}components${path.sep}atomic${path.sep}`);
    return {
      JSXAttribute(node) {
        if (isAllowed) return;
        if (
          (node.name.name === 'className' || node.name.name === 'class') &&
          node.value &&
          node.value.type === 'Literal' &&
          typeof node.value.value === 'string' &&
          /[a-zA-Z0-9\-]+/.test(node.value.value)
        ) {
          context.report({
            node,
            message: `Inline Tailwind/className is not allowed outside components/ui or components/atomic. Use a style constant instead.`,
          });
        }
      },
    };
  },
}; 