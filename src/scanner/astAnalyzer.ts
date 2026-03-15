import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { readFileSync } from 'fs';
import { parse as parseVue } from '@vue/compiler-sfc';

export interface CodeFeature {
  feature: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  syntax: string;
  maxVersion?: string; // Maximum required version across browsers, for sorting
}

// Track which logical assignment operators are ES2021
const LOGICAL_ASSIGNMENT_OPERATORS = ['??=', '||=', '&&='];

// API detection configuration
const OBJECT_METHODS: Record<string, string> = {
  entries: 'object-entries',
  values: 'object-values',
  keys: 'object-keys',
  assign: 'object-assign',
  is: 'object-is',
  fromEntries: 'object-fromentries',
};

const ARRAY_METHODS: Record<string, string> = {
  includes: 'array-includes',
  find: 'array-find',
  findIndex: 'array-findindex',
  findLast: 'es2023-array-methods',
  findLastIndex: 'es2023-array-methods',
  flat: 'array-flat',
  flatMap: 'array-flat',
  fill: 'array-fill',
  copyWithin: 'array-copywithin',
  at: 'array-at',
  toSorted: 'es2023-array-methods',
  toReversed: 'es2023-array-methods',
  with: 'es2023-array-methods',
};

const STRING_METHODS: Record<string, string> = {
  includes: 'string-includes',
  startsWith: 'string-startswith',
  endsWith: 'string-endswith',
  repeat: 'string-repeat',
  padStart: 'string-padstart',
  padEnd: 'string-padend',
  trimStart: 'string-trimstart',
  trimEnd: 'string-trimend',
  trimLeft: 'string-trimstart',
  trimRight: 'string-trimend',
  matchAll: 'string-matchall',
  replaceAll: 'string-replaceall',
};

const PROMISE_METHODS: Record<string, string> = {
  all: 'promise-all',
  allSettled: 'promise-allsettled',
  any: 'promise-any',
  race: 'promise-all',
  finally: 'promise-finally',
};

const NUMBER_METHODS: Record<string, string> = {
  isNaN: 'number-isnan',
  isFinite: 'number-isfinite',
  isInteger: 'number-isinteger',
  isSafeInteger: 'number-issafeinteger',
  parseFloat: 'number-parsefloat',
  parseInt: 'number-parseint',
};

const MATH_METHODS: Record<string, string> = {
  trunc: 'math-trunc',
  sign: 'math-sign',
  cbrt: 'math-cbrt',
  hypot: 'math-hypot',
};

const GLOBAL_OBJECTS: Record<string, string> = {
  Map: 'map',
  Set: 'set',
  WeakMap: 'weakmap',
  WeakSet: 'weakset',
  Symbol: 'symbols',
  Proxy: 'proxy',
  Reflect: 'reflect',
  Promise: 'promise',
  URL: 'url',
  URLSearchParams: 'url-search-params',
  AbortController: 'abortcontroller',
  IntersectionObserver: 'intersection-observer',
  ResizeObserver: 'resize-observer',
  MutationObserver: 'mutation-observer',
  BroadcastChannel: 'broadcast-channel',
  TextEncoder: 'text-encoder',
  TextDecoder: 'text-decoder',
  BigInt: 'bigint',
};

const GLOBAL_FUNCTIONS: Record<string, string> = {
  fetch: 'fetch',
  isFinite: 'isfinite',
  isNaN: 'isnan',
};

export function analyzeFile(filePath: string): CodeFeature[] {
  const content = readFileSync(filePath, 'utf-8');
  const ext = filePath.split('.').pop()?.toLowerCase();

  let code = content;

  // Handle Vue files
  if (ext === 'vue') {
    const parsed = parseVue(content, { filename: filePath });
    const scriptBlock = parsed.descriptor.script ?? parsed.descriptor.scriptSetup;
    if (!scriptBlock) {
      return [];
    }
    code = scriptBlock.content;
  }

  const features: CodeFeature[] = [];
  const seenFeatures = new Set<string>();

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'topLevelAwait',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'nullishCoalescingOperator',
        'optionalChaining',
        'logicalAssignment',
        'numericSeparator',
        'bigInt',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'asyncGenerators',
        'objectRestSpread',
        'optionalCatchBinding',
      ],
      errorRecovery: true,
    });

    traverse(ast, {
      // ES6+ Syntax
      ArrowFunctionExpression(path: NodePath<t.ArrowFunctionExpression>) {
        addFeature(features, 'arrow-functions', path.node.loc, filePath, 'Arrow Function', seenFeatures);
      },

      ClassDeclaration(path: NodePath<t.ClassDeclaration>) {
        addFeature(features, 'es6-class', path.node.loc, filePath, 'Class Declaration', seenFeatures);
        // Check for class fields
        if (path.node.body.body.some(n => t.isClassProperty(n) || t.isClassPrivateProperty(n))) {
          addFeature(features, 'public-class-fields', path.node.loc, filePath, 'Class Fields', seenFeatures);
        }
      },

      ClassExpression(path: NodePath<t.ClassExpression>) {
        addFeature(features, 'es6-class', path.node.loc, filePath, 'Class Expression', seenFeatures);
        if (path.node.body.body.some(n => t.isClassProperty(n) || t.isClassPrivateProperty(n))) {
          addFeature(features, 'public-class-fields', path.node.loc, filePath, 'Class Fields', seenFeatures);
        }
      },

      TemplateLiteral(path: NodePath<t.TemplateLiteral>) {
        addFeature(features, 'template-literals', path.node.loc, filePath, 'Template Literal', seenFeatures);
      },

      SpreadElement(path: NodePath<t.SpreadElement>) {
        addFeature(features, 'spread-operator', path.node.loc, filePath, 'Spread Operator', seenFeatures);
      },

      RestElement(path: NodePath<t.RestElement>) {
        addFeature(features, 'rest-parameters', path.node.loc, filePath, 'Rest Parameters', seenFeatures);
      },

      AwaitExpression(path: NodePath<t.AwaitExpression>) {
        addFeature(features, 'async-functions', path.node.loc, filePath, 'Await Expression', seenFeatures);
      },

      OptionalMemberExpression(path: NodePath<t.OptionalMemberExpression>) {
        addFeature(features, 'optional-chaining', path.node.loc, filePath, 'Optional Chaining', seenFeatures);
      },

      OptionalCallExpression(path: NodePath<t.OptionalCallExpression>) {
        addFeature(features, 'optional-chaining', path.node.loc, filePath, 'Optional Call Expression', seenFeatures);
      },

      LogicalExpression(path: NodePath<t.LogicalExpression>) {
        if (path.node.operator === '??') {
          addFeature(features, 'nullish-coalescing', path.node.loc, filePath, 'Nullish Coalescing', seenFeatures);
        }
        if (LOGICAL_ASSIGNMENT_OPERATORS.includes(path.node.operator)) {
          addFeature(features, 'logical-assignment', path.node.loc, filePath, `Logical Assignment (${path.node.operator})`, seenFeatures);
        }
      },

      BinaryExpression(path: NodePath<t.BinaryExpression>) {
        // Exponentiation operator
        if (path.node.operator === '**') {
          addFeature(features, 'exponentiation', path.node.loc, filePath, 'Exponentiation Operator', seenFeatures);
        }
      },

      AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
        if (LOGICAL_ASSIGNMENT_OPERATORS.includes(path.node.operator)) {
          addFeature(features, 'logical-assignment', path.node.loc, filePath, `Logical Assignment (${path.node.operator})`, seenFeatures);
        }
      },

      BigIntLiteral(path: NodePath<t.BigIntLiteral>) {
        addFeature(features, 'bigint', path.node.loc, filePath, 'BigInt Literal', seenFeatures);
      },

      StaticBlock(path: NodePath<t.StaticBlock>) {
        addFeature(features, 'class-static-block', path.node.loc, filePath, 'Static Block', seenFeatures);
      },

      ObjectPattern(path: NodePath<t.ObjectPattern>) {
        addFeature(features, 'destructuring', path.node.loc, filePath, 'Object Destructuring', seenFeatures);
      },

      ArrayPattern(path: NodePath<t.ArrayPattern>) {
        addFeature(features, 'destructuring', path.node.loc, filePath, 'Array Destructuring', seenFeatures);
      },

      ForOfStatement(path: NodePath<t.ForOfStatement>) {
        addFeature(features, 'for-of', path.node.loc, filePath, 'For...of Loop', seenFeatures);
      },

      FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
        if (path.node.async) {
          addFeature(features, 'async-functions', path.node.loc, filePath, 'Async Function', seenFeatures);
        }
        if (path.node.generator) {
          addFeature(features, 'generators', path.node.loc, filePath, 'Generator Function', seenFeatures);
        }
        // Default parameters
        if (path.node.params.some(p => t.isAssignmentPattern(p))) {
          addFeature(features, 'default-parameters', path.node.loc, filePath, 'Default Parameters', seenFeatures);
        }
      },

      FunctionExpression(path: NodePath<t.FunctionExpression>) {
        if (path.node.async) {
          addFeature(features, 'async-functions', path.node.loc, filePath, 'Async Function Expression', seenFeatures);
        }
        if (path.node.generator) {
          addFeature(features, 'generators', path.node.loc, filePath, 'Generator Function', seenFeatures);
        }
        if (path.node.params.some(p => t.isAssignmentPattern(p))) {
          addFeature(features, 'default-parameters', path.node.loc, filePath, 'Default Parameters', seenFeatures);
        }
      },

      ImportExpression(path: NodePath<t.ImportExpression>) {
        addFeature(features, 'dynamic-import', path.node.loc, filePath, 'Dynamic Import', seenFeatures);
      },

      NewExpression(path: NodePath<t.NewExpression>) {
        const callee = path.node.callee;
        if (t.isIdentifier(callee)) {
          const feature = GLOBAL_OBJECTS[callee.name];
          if (feature) {
            addFeature(features, feature, path.node.loc, filePath, `new ${callee.name}()`, seenFeatures);
          }
        }
      },

      CallExpression(path: NodePath<t.CallExpression>) {
        const callee = path.node.callee;

        // Check for global function calls
        if (t.isIdentifier(callee)) {
          const feature = GLOBAL_FUNCTIONS[callee.name];
          if (feature) {
            addFeature(features, feature, path.node.loc, filePath, `${callee.name}()`, seenFeatures);
          }

          // Array.from, Array.of
          if (callee.name === 'Array') {
            // This is handled separately - Array constructor
          }
        }

        // Check for member expression calls (obj.method())
        if (t.isMemberExpression(callee)) {
          const property = callee.property;

          if (t.isIdentifier(property)) {
            // Check for Object methods
            if (t.isIdentifier(callee.object) && callee.object.name === 'Object') {
              const feature = OBJECT_METHODS[property.name];
              if (feature) {
                addFeature(features, feature, path.node.loc, filePath, `Object.${property.name}()`, seenFeatures);
              }
              if (property.name === 'from') {
                addFeature(features, 'array-from', path.node.loc, filePath, 'Array.from()', seenFeatures);
              }
              if (property.name === 'of') {
                addFeature(features, 'array-of', path.node.loc, filePath, 'Array.of()', seenFeatures);
              }
            }

            // Check for Number methods
            if (t.isIdentifier(callee.object) && callee.object.name === 'Number') {
              const feature = NUMBER_METHODS[property.name];
              if (feature) {
                addFeature(features, feature, path.node.loc, filePath, `Number.${property.name}()`, seenFeatures);
              }
            }

            // Check for Math methods
            if (t.isIdentifier(callee.object) && callee.object.name === 'Math') {
              const feature = MATH_METHODS[property.name];
              if (feature) {
                addFeature(features, feature, path.node.loc, filePath, `Math.${property.name}()`, seenFeatures);
              }
            }

            // Check for Promise methods
            if (t.isIdentifier(callee.object) && callee.object.name === 'Promise') {
              const feature = PROMISE_METHODS[property.name];
              if (feature) {
                addFeature(features, feature, path.node.loc, filePath, `Promise.${property.name}()`, seenFeatures);
              }
            }

            // Check for Array prototype methods
            const arrayFeature = ARRAY_METHODS[property.name];
            if (arrayFeature) {
              addFeature(features, arrayFeature, path.node.loc, filePath, `Array.prototype.${property.name}()`, seenFeatures);
            }

            // Check for String prototype methods
            const stringFeature = STRING_METHODS[property.name];
            if (stringFeature) {
              addFeature(features, stringFeature, path.node.loc, filePath, `String.prototype.${property.name}()`, seenFeatures);
            }
          }
        }
      },

      // Top-level await
      Program(path: NodePath<t.Program>) {
        for (const node of path.node.body) {
          if (t.isExpressionStatement(node) && t.isAwaitExpression(node.expression)) {
            addFeature(features, 'top-level-await', node.loc, filePath, 'Top-level Await', seenFeatures);
          }
        }
      },

      // Object rest spread in object expressions
      ObjectExpression(path: NodePath<t.ObjectExpression>) {
        for (const prop of path.node.properties) {
          if (t.isSpreadElement(prop)) {
            addFeature(features, 'object-rest-spread', path.node.loc, filePath, 'Object Spread', seenFeatures);
            break;
          }
        }
      },
    });
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
  }

  return features;
}

function addFeature(
  features: CodeFeature[],
  featureName: string,
  loc: t.SourceLocation | null | undefined,
  filePath: string,
  syntax: string,
  seenFeatures: Set<string>
): void {
  if (!loc) return;

  const key = `${featureName}:${loc.start.line}:${loc.start.column}`;
  if (seenFeatures.has(key)) return;

  seenFeatures.add(key);

  features.push({
    feature: featureName,
    location: {
      file: filePath,
      line: loc.start.line,
      column: loc.start.column + 1,
    },
    syntax,
  });
}
