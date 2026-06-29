const path = require('path');
const { buildCrossFeatureZones } = require('./scripts/eslint-feature-zones.cjs');

module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      alias: {
        map: [['@', path.resolve(__dirname, 'src')]],
        extensions: ['.js', '.jsx'],
      },
    },
  },
  plugins: ['react-refresh', 'import'],
  rules: {
    'react/prop-types': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    /** Architecture: features must not import other features — use @/shared/ */
    'import/no-restricted-paths': [
      'error',
      {
        zones: buildCrossFeatureZones(),
      },
    ],
  },
};
