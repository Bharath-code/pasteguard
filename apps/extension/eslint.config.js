import tseslint from 'typescript-eslint'
export default tseslint.config(
  { ignores: ['.output', '.wxt', 'spike', 'design'] },
  ...tseslint.configs.strict,
  {
    rules: {
      'no-restricted-properties': [
        'error',
        ...['innerHTML', 'outerHTML'].map(property => ({ property, message: 'Use textContent/createElement' })),
        { property: 'insertAdjacentHTML', message: 'Use createElement' },
      ],
      'no-restricted-syntax': ['error', { selector: "NewExpression[callee.name='Function']", message: 'No new Function' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-restricted-imports': ['error', { paths: [{ name: '@pasteguard/core/typosquat', message: 'SW only' }] }],
    },
  },
  { files: ['entrypoints/background.ts', 'src/sw/**'], rules: { 'no-restricted-imports': 'off' } },
)
