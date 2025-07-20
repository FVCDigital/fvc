const path = require('path');

const RAW_TAGS = [
  'div', 'button', 'span', 'section', 'header', 'footer', 'main', 'ul', 'li', 'nav', 'form', 'input', 'textarea', 'select', 'label', 'img', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
];

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw HTML tags outside components/ui and components/atomic',
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
      JSXOpeningElement(node) {
        if (isAllowed) return;
        const tagName = node.name && node.name.name;
        if (RAW_TAGS.includes(tagName)) {
          context.report({
            node,
            message: `Raw HTML tag <${tagName}> is not allowed outside components/ui or components/atomic. Use an atomic component instead.`,
          });
        }
      },
    };
  },
}; 