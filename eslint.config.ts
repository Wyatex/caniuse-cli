import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'app',
  typescript: true,
  react: true,
  formatters: {
    css: true,
    html: true,
    markdown: 'prettier',
  },
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: false,
  },
  rules: {
    'node/prefer-global/process': 'off',
    'no-console': 'off',
    'e18e/prefer-static-regex': 'off',
  },
  ignores: ['.agents', '.claude'],
})
