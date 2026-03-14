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
}

// Track which logical assignment operators are ES2021
const LOGICAL_ASSIGNMENT_OPERATORS = ['??=', '||=', '&&='];

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
      ArrowFunctionExpression(path: NodePath<t.ArrowFunctionExpression>) {
        addFeature(features, 'arrow-functions', path.node.loc, filePath, 'Arrow Function', seenFeatures);
      },

      ClassDeclaration(path: NodePath<t.ClassDeclaration>) {
        addFeature(features, 'es6-class', path.node.loc, filePath, 'Class Declaration', seenFeatures);
      },

      ClassExpression(path: NodePath<t.ClassExpression>) {
        addFeature(features, 'es6-class', path.node.loc, filePath, 'Class Expression', seenFeatures);
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
        // Nullish coalescing operator ??
        if (path.node.operator === '??') {
          addFeature(features, 'nullish-coalescing', path.node.loc, filePath, 'Nullish Coalescing', seenFeatures);
        }
        // Logical assignment operators ??= ||= &&=
        if (LOGICAL_ASSIGNMENT_OPERATORS.includes(path.node.operator)) {
          addFeature(features, 'logical-assignment', path.node.loc, filePath, `Logical Assignment (${path.node.operator})`, seenFeatures);
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

      FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
        if (path.node.async) {
          addFeature(features, 'async-functions', path.node.loc, filePath, 'Async Function', seenFeatures);
        }
        if (path.node.generator) {
          addFeature(features, 'generators', path.node.loc, filePath, 'Generator Function', seenFeatures);
        }
      },

      FunctionExpression(path: NodePath<t.FunctionExpression>) {
        if (path.node.async) {
          addFeature(features, 'async-functions', path.node.loc, filePath, 'Async Function Expression', seenFeatures);
        }
        if (path.node.generator) {
          addFeature(features, 'generators', path.node.loc, filePath, 'Generator Function', seenFeatures);
        }
      },

      ImportExpression(path: NodePath<t.ImportExpression>) {
        addFeature(features, 'dynamic-import', path.node.loc, filePath, 'Dynamic Import', seenFeatures);
      },

      // ES2023 array methods
      CallExpression(path: NodePath<t.CallExpression>) {
        const callee = path.node.callee;
        if (t.isMemberExpression(callee)) {
          const property = callee.property;
          if (t.isIdentifier(property)) {
            const es2023Methods = ['toSorted', 'toReversed', 'with', 'findLast', 'findLastIndex'];
            if (es2023Methods.includes(property.name)) {
              addFeature(features, 'es2023-array-methods', path.node.loc, filePath, `Array.${property.name}()`, seenFeatures);
            }
          }
        }
      },

      // Top-level await
      Program(path: NodePath<t.Program>) {
        // Check for top-level await by looking at the body
        for (const node of path.node.body) {
          if (t.isExpressionStatement(node) && t.isAwaitExpression(node.expression)) {
            addFeature(features, 'top-level-await', node.loc, filePath, 'Top-level Await', seenFeatures);
          }
        }
      },
    });
  } catch (error) {
    // Parse error - skip this file
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
