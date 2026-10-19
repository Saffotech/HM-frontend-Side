/**
 * ESLint import resolver that understands Vite import queries such as `?url`.
 * The query is a bundler hint; the underlying module path is still resolved.
 */
const aliasResolver = require('eslint-import-resolver-alias');

exports.interfaceVersion = 2;

exports.resolve = function resolve(source, file, config) {
  const cleaned = String(source).replace(/\?.*$/, '');
  return aliasResolver.resolve(cleaned, file, config);
};
