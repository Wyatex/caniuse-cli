/**
 * Feature mappings from internal feature names to external data sources.
 *
 * Data source priority:
 * 1. @babel/compat-data - Syntax features (transform plugins)
 * 2. caniuse-lite - API features
 * 3. core-js-compat - Polyfill modules
 */

// Syntax features → @babel/compat-data plugin names
export const SYNTAX_FEATURE_MAP: Record<string, string> = {
  'arrow-functions': 'transform-arrow-functions',
  'es6-class': 'transform-classes',
  'template-literals': 'transform-template-literals',
  'spread-operator': 'transform-spread',
  'rest-parameters': 'transform-parameters',
  'async-functions': 'transform-async-to-generator',
  'optional-chaining': 'transform-optional-chaining',
  'nullish-coalescing': 'transform-nullish-coalescing-operator',
  'logical-assignment': 'transform-logical-assignment-operators',
  'exponentiation': 'transform-exponentiation-operator',
  'class-static-block': 'transform-class-static-block',
  'destructuring': 'transform-destructuring',
  'for-of': 'transform-for-of',
  'generators': 'transform-regenerator',
  'default-parameters': 'transform-parameters',
  'object-rest-spread': 'transform-object-rest-spread',
  'public-class-fields': 'transform-class-properties',
  'private-methods': 'transform-private-methods',
}

// API features → caniuse-lite feature IDs
export const CANIUSE_FEATURE_MAP: Record<string, string> = {
  // ES6+ APIs
  'promise': 'promises',
  'proxy': 'proxy',
  'bigint': 'bigint',
  'url': 'url',
  'url-search-params': 'urlsearchparams',
  'abortcontroller': 'abortcontroller',
  'intersection-observer': 'intersectionobserver',
  'resize-observer': 'resizeobserver',
  'mutation-observer': 'mutationobserver',
  'broadcast-channel': 'broadcastchannel',
  'text-encoder': 'textencoder',
  'text-decoder': 'textencoder',
  'fetch': 'fetch',
  'object-entries': 'object-entries',
  'object-values': 'object-values',
  'typed-arrays': 'typedarrays',
  'dynamic-import': 'es6-module-dynamic-import',
  'promise-finally': 'promise-finally',

  // ES2016+
  'array-includes': 'array-includes',

  // ES5/ES6 APIs (caniuse has better data)
  'array-find': 'array-find',
  'array-findindex': 'array-find-index',
  'string-includes': 'es6-string-includes',

  // ES2019+
  'array-flat': 'array-flat',
  'object-fromentries': 'object-fromentries',

  // ES2020+
  'promise-any': 'promise-any',

  // ES2021+
  'weakref': 'weakrefs',

  // Math methods (caniuse-lite doesn't have separate entries)
  // These will fallback to core-js-compat or manual values

  // Number methods (caniuse-lite doesn't have separate entries)
  // These will fallback to core-js-compat or manual values
}

// API features → core-js-compat module names
export const COREJS_FEATURE_MAP: Record<string, string> = {
  // ES6 collections
  'map': 'es.map',
  'set': 'es.set',
  'weakmap': 'es.weak-map',
  'weakset': 'es.weak-set',
  'symbols': 'es.symbol',
  'reflect': 'es.reflect',

  // Object methods
  'object-assign': 'es.object.assign',
  'object-is': 'es.object.is',
  'object-keys': 'es.object.keys',
  'object-fromentries': 'es.object.from-entries',

  // Array methods
  'array-includes': 'es.array.includes',
  'array-find': 'es.array.find',
  'array-findindex': 'es.array.find-index',
  'array-flat': 'es.array.flat',
  'array-fill': 'es.array.fill',
  'array-copywithin': 'es.array.copy-within',
  'array-at': 'es.array.at',
  'array-from': 'es.array.from',
  'array-of': 'es.array.of',
  'es2023-array-methods': 'es.array.to-sorted', // Representative for ES2023 methods

  // String methods
  'string-includes': 'es.string.includes',
  'string-startswith': 'es.string.starts-with',
  'string-endswith': 'es.string.ends-with',
  'string-repeat': 'es.string.repeat',
  'string-padstart': 'es.string.pad-start',
  'string-padend': 'es.string.pad-end',
  'string-trimstart': 'es.string.trim-start',
  'string-trimend': 'es.string.trim-end',
  'string-matchall': 'es.string.match-all',
  'string-replaceall': 'es.string.replace-all',

  // Promise methods
  'promise-all': 'es.promise.all-settled',
  'promise-allsettled': 'es.promise.all-settled',
  'promise-any': 'es.promise.any',

  // Number methods
  'number-isnan': 'es.number.is-nan',
  'number-isfinite': 'es.number.is-finite',
  'number-isinteger': 'es.number.is-integer',
  'number-issafeinteger': 'es.number.is-safe-integer',
  'number-parsefloat': 'es.number.parse-float',
  'number-parseint': 'es.number.parse-int',

  // Math methods
  'math-trunc': 'es.math.trunc',
  'math-sign': 'es.math.sign',
  'math-cbrt': 'es.math.cbrt',
  'math-hypot': 'es.math.hypot',

  // Global functions
  'isfinite': 'es.global-this',
  'isnan': 'es.global-this',
}

// Features that need manual fallback values (not in any data source)
export const MANUAL_FEATURE_VERSIONS: Record<string, Record<string, string>> = {
  // Top-level await is not in @babel/compat-data yet
  'top-level-await': { chrome: '89', firefox: '89', safari: '15', edge: '89' },

  // Private class fields (different from private methods)
  'private-class-fields': { chrome: '74', firefox: '90', safari: '14.1', edge: '79' },

  // Async iteration (not well covered in caniuse-lite)
  'async-iteration': { chrome: '63', firefox: '57', safari: '12', edge: '79' },

  // Numeric separator
  'numeric-separator': { chrome: '75', firefox: '70', safari: '13', edge: '79' },
}

// Browser name mapping for different data sources
export const BROWSER_NAME_MAP: Record<string, Record<string, string>> = {
  // For @babel/compat-data and core-js-compat
  babel: {
    chrome: 'chrome',
    firefox: 'firefox',
    safari: 'safari',
    edge: 'edge',
    ie: 'ie',
  },
  // For caniuse-lite
  caniuse: {
    chrome: 'chrome',
    firefox: 'firefox',
    safari: 'safari',
    edge: 'edge',
    and_chr: 'and_chr',
    and_ff: 'and_ff',
    ios_saf: 'ios_saf',
  },
}
