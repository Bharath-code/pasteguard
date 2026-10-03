import tseslint from 'typescript-eslint'
export default tseslint.config(
  { ignores: ['.output', '.wxt', '.playwright', 'spike', 'design', 'e2e/mock/*.js', 'e2e/snapshots'] },
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
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error', { property: 'innerHTML', message: 'Use textContent/createElement' }, { property: 'insertAdjacentHTML', message: 'Use createElement' }],
    },
  },
  { files: ['entrypoints/background.ts', 'src/sw/**'], rules: { 'no-restricted-imports': 'off' } },
)
