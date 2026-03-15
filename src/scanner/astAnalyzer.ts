import type { NodePath } from '@babel/traverse'
import { readFileSync } from 'node:fs'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import bcd from '@mdn/browser-compat-data'

import { parse as parseVue } from '@vue/compiler-sfc'
// 动态引入 npm 包数据
import coreJsData from 'core-js-compat/data'

export interface CodeFeature {
  feature: string
  location: {
    file: string
    line: number
    column: number
  }
  syntax: string
  maxVersion?: string // Maximum required version across browsers, for sorting
}

// Track which logical assignment operators are ES2021
const LOGICAL_ASSIGNMENT_OPERATORS = ['??=', '||=', '&&=']

// 自动构建的字典
const DYNAMIC_GLOBALS: Record<string, string> = {}
const DYNAMIC_STATIC_METHODS: Record<string, Record<string, string>> = {}
const DYNAMIC_INSTANCE_METHODS: Record<string, string> = {}
const DYNAMIC_WEB_APIS = new Set<string>()

// 增加一个忽略名单，存放那些不需要进行现代特性检查的基础实例方法
const IGNORED_INSTANCE_METHODS = new Set([
  // Array 的原生基础方法 (ES3/ES5)
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'concat',
  'join',
  'slice',
  'indexOf',
  'lastIndexOf',
  'forEach',
  'map',
  'filter',
  'reduce',
  'reduceRight',
  'some',
  'every',

  // String 的原生基础方法 (ES3/ES5)
  'split',
  'replace',
  'substring',
  'substr',
  'charAt',
  'charCodeAt',
  'toLowerCase',
  'toUpperCase',
  'trim',
  'search',
  'match',

  // Object / Function / Symbol 的基础方法
  'toString',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'valueOf',
  'bind',
  'call',
  'apply',

  // Map / Set 等数据结构的基础方法 (解决 groups.get 和 groups.set 误报)
  'get',
  'set',
  'has',
  'delete',
  'clear',
  'add',
])

/**
 * 启动时动态构建所有新特性的字典，告别硬编码！
 */
function initializeDynamicMappings() {
  // 1. 从 core-js-compat 解析所有的 JS 核心标准 (支持到未来的 esnext)
  for (const feature of Object.keys(coreJsData)) {
    if (!feature.startsWith('es.') && !feature.startsWith('esnext.'))
      continue
    const parts = feature.split('.')

    if (parts.length === 2) {
      // 全局对象，如 es.promise -> Promise
      const name = parts[1]!.charAt(0).toUpperCase() + parts[1]!.slice(1)
      DYNAMIC_GLOBALS[name] = feature
    }
    else if (parts.length >= 3) {
      // API 特性，如 es.array.find-last -> Array, find-last
      const objectName = parts[1]!.charAt(0).toUpperCase() + parts[1]!.slice(1)
      const rawMethod = parts[2] // find-last
      // 转换为小驼峰：find-last -> findLast
      const camelMethod = rawMethod!.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

      // 注册静态方法
      if (!DYNAMIC_STATIC_METHODS[objectName])
        DYNAMIC_STATIC_METHODS[objectName] = {}
      DYNAMIC_STATIC_METHODS[objectName][camelMethod] = feature

      // 注册实例方法（为了减少误报，只对典型数据结构原型收集）
      if (['Array', 'String', 'Promise', 'Set', 'Map', 'Object'].includes(objectName)) {
        // 如果是 .push, .get, .map 等基础方法，直接忽略，不存入字典！
        if (!IGNORED_INSTANCE_METHODS.has(camelMethod)) {
          DYNAMIC_INSTANCE_METHODS[camelMethod] = feature
        }
      }
    }
  }

  // 2. 从 MDN 数据源动态抓取 Web API (DOM/BOM 如 IntersectionObserver)
  if (bcd && bcd.api) {
    for (const apiName of Object.keys(bcd.api)) {
      DYNAMIC_WEB_APIS.add(apiName)
    }
  }
}

// 执行初始化
initializeDynamicMappings()

export function analyzeFile(filePath: string): CodeFeature[] {
  const content = readFileSync(filePath, 'utf-8')
  const ext = filePath.split('.').pop()?.toLowerCase()

  let code = content

  // Handle Vue files
  if (ext === 'vue') {
    const parsed = parseVue(content, { filename: filePath })
    const scriptBlock = parsed.descriptor.script ?? parsed.descriptor.scriptSetup
    if (!scriptBlock) {
      return []
    }
    code = scriptBlock.content
  }

  const features: CodeFeature[] = []
  const seenFeatures = new Set<string>()

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: [
        // 1. 语言扩展 (必加)
        'typescript',
        'jsx',

        // 2. 即将到来的新规范（处于 Stage 3，目前 Babel 可能还没默认开启的提案）
        'decorators-legacy', // 目前很多前端框架还在用旧版装饰器，如不加解析会报错
        'explicitResourceManagement', // ES2025 的 using 关键字
        'recordAndTuple', // 记录与元组提案 #{ x: 1 }
        'importAssertions', // 导入断言 import json from "./data.json" assert { type: "json" };
      ],
      errorRecovery: true,
    })

    traverse(ast, {
      // ES6+ Syntax
      ArrowFunctionExpression(path: NodePath<t.ArrowFunctionExpression>) {
        addFeature(features, 'arrow-functions', path.node.loc, filePath, 'Arrow Function', seenFeatures)
      },

      ClassDeclaration(path: NodePath<t.ClassDeclaration>) {
        addFeature(features, 'es6-class', path.node.loc, filePath, 'Class Declaration', seenFeatures)
        // Check for class fields
        if (path.node.body.body.some(n => t.isClassProperty(n) || t.isClassPrivateProperty(n))) {
          addFeature(features, 'public-class-fields', path.node.loc, filePath, 'Class Fields', seenFeatures)
        }
      },

      ClassExpression(path: NodePath<t.ClassExpression>) {
        addFeature(features, 'es6-class', path.node.loc, filePath, 'Class Expression', seenFeatures)
        if (path.node.body.body.some(n => t.isClassProperty(n) || t.isClassPrivateProperty(n))) {
          addFeature(features, 'public-class-fields', path.node.loc, filePath, 'Class Fields', seenFeatures)
        }
      },

      TemplateLiteral(path: NodePath<t.TemplateLiteral>) {
        addFeature(features, 'template-literals', path.node.loc, filePath, 'Template Literal', seenFeatures)
      },

      SpreadElement(path: NodePath<t.SpreadElement>) {
        addFeature(features, 'spread-operator', path.node.loc, filePath, 'Spread Operator', seenFeatures)
      },

      RestElement(path: NodePath<t.RestElement>) {
        addFeature(features, 'rest-parameters', path.node.loc, filePath, 'Rest Parameters', seenFeatures)
      },

      AwaitExpression(path: NodePath<t.AwaitExpression>) {
        addFeature(features, 'async-functions', path.node.loc, filePath, 'Await Expression', seenFeatures)
      },

      OptionalMemberExpression(path) {
        addFeature(features, 'transform-optional-chaining', path.node.loc, filePath, 'Optional Chaining', seenFeatures)
      },

      OptionalCallExpression(path: NodePath<t.OptionalCallExpression>) {
        addFeature(features, 'transform-optional-chaining', path.node.loc, filePath, 'Optional Call Expression', seenFeatures)
      },

      LogicalExpression(path) {
        if (path.node.operator === '??') {
          addFeature(features, 'transform-nullish-coalescing-operator', path.node.loc, filePath, 'Nullish Coalescing', seenFeatures)
        }
        if (['??=', '||=', '&&='].includes(path.node.operator)) {
          addFeature(features, 'transform-logical-assignment-operators', path.node.loc, filePath, `Logical Assignment`, seenFeatures)
        }
      },

      BinaryExpression(path: NodePath<t.BinaryExpression>) {
        // Exponentiation operator
        if (path.node.operator === '**') {
          addFeature(features, 'exponentiation', path.node.loc, filePath, 'Exponentiation Operator', seenFeatures)
        }
      },

      AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
        if (LOGICAL_ASSIGNMENT_OPERATORS.includes(path.node.operator)) {
          addFeature(features, 'logical-assignment', path.node.loc, filePath, `Logical Assignment (${path.node.operator})`, seenFeatures)
        }
      },

      BigIntLiteral(path: NodePath<t.BigIntLiteral>) {
        addFeature(features, 'bigint', path.node.loc, filePath, 'BigInt Literal', seenFeatures)
      },

      StaticBlock(path: NodePath<t.StaticBlock>) {
        addFeature(features, 'class-static-block', path.node.loc, filePath, 'Static Block', seenFeatures)
      },

      ObjectPattern(path: NodePath<t.ObjectPattern>) {
        addFeature(features, 'destructuring', path.node.loc, filePath, 'Object Destructuring', seenFeatures)
      },

      ArrayPattern(path: NodePath<t.ArrayPattern>) {
        addFeature(features, 'destructuring', path.node.loc, filePath, 'Array Destructuring', seenFeatures)
      },

      ForOfStatement(path: NodePath<t.ForOfStatement>) {
        addFeature(features, 'for-of', path.node.loc, filePath, 'For...of Loop', seenFeatures)
      },

      FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
        if (path.node.async) {
          addFeature(features, 'async-functions', path.node.loc, filePath, 'Async Function', seenFeatures)
        }
        if (path.node.generator) {
          addFeature(features, 'generators', path.node.loc, filePath, 'Generator Function', seenFeatures)
        }
        // Default parameters
        if (path.node.params.some(p => t.isAssignmentPattern(p))) {
          addFeature(features, 'default-parameters', path.node.loc, filePath, 'Default Parameters', seenFeatures)
        }
      },

      FunctionExpression(path: NodePath<t.FunctionExpression>) {
        if (path.node.async) {
          addFeature(features, 'async-functions', path.node.loc, filePath, 'Async Function Expression', seenFeatures)
        }
        if (path.node.generator) {
          addFeature(features, 'generators', path.node.loc, filePath, 'Generator Function', seenFeatures)
        }
        if (path.node.params.some(p => t.isAssignmentPattern(p))) {
          addFeature(features, 'default-parameters', path.node.loc, filePath, 'Default Parameters', seenFeatures)
        }
      },

      ImportExpression(path: NodePath<t.ImportExpression>) {
        addFeature(features, 'dynamic-import', path.node.loc, filePath, 'Dynamic Import', seenFeatures)
      },

      NewExpression(path) {
        const callee = path.node.callee
        if (t.isIdentifier(callee)) {
          // JS 核心对象如 new Promise()
          if (DYNAMIC_GLOBALS[callee.name]) {
            addFeature(features, DYNAMIC_GLOBALS[callee.name]!, path.node.loc, filePath, `new ${callee.name}()`, seenFeatures)
          }
          // DOM API 如 new IntersectionObserver()
          else if (DYNAMIC_WEB_APIS.has(callee.name)) {
            addFeature(features, `api.${callee.name}`, path.node.loc, filePath, `new ${callee.name}()`, seenFeatures)
          }
        }
      },

      CallExpression(path) {
        const callee = path.node.callee

        // 全局函数调用，例如 fetch(), structuredClone()
        if (t.isIdentifier(callee) && DYNAMIC_WEB_APIS.has(callee.name)) {
          addFeature(features, `api.${callee.name}`, path.node.loc, filePath, `${callee.name}()`, seenFeatures)
        }

        // 成员方法调用，例如 obj.method()
        if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
          const propName = callee.property.name

          // a. 检查静态方法，例如 Promise.withResolvers() / Object.fromEntries()
          if (t.isIdentifier(callee.object) && DYNAMIC_STATIC_METHODS[callee.object.name]?.[propName]) {
            const featureName = DYNAMIC_STATIC_METHODS[callee.object.name]![propName]!
            addFeature(features, featureName, path.node.loc, filePath, `${callee.object.name}.${propName}()`, seenFeatures)
          }
          // b. 检查实例方法，例如 arr.findLast()
          else if (DYNAMIC_INSTANCE_METHODS[propName]) {
            const featureName = DYNAMIC_INSTANCE_METHODS[propName]
            addFeature(features, featureName, path.node.loc, filePath, `.${propName}()`, seenFeatures)
          }
        }
      },

      // Top-level await
      Program(path: NodePath<t.Program>) {
        for (const node of path.node.body) {
          if (t.isExpressionStatement(node) && t.isAwaitExpression(node.expression)) {
            addFeature(features, 'top-level-await', node.loc, filePath, 'Top-level Await', seenFeatures)
          }
        }
      },

      // Object rest spread in object expressions
      ObjectExpression(path: NodePath<t.ObjectExpression>) {
        for (const prop of path.node.properties) {
          if (t.isSpreadElement(prop)) {
            addFeature(features, 'object-rest-spread', path.node.loc, filePath, 'Object Spread', seenFeatures)
            break
          }
        }
      },
    })
  }
  catch (error) {
    console.error(`Error parsing ${filePath}:`, error)
  }

  return features
}

function addFeature(
  features: CodeFeature[],
  featureName: string,
  loc: t.SourceLocation | null | undefined,
  filePath: string,
  syntax: string,
  seenFeatures: Set<string>,
): void {
  if (!loc)
    return

  const key = `${featureName}:${loc.start.line}:${loc.start.column}`
  if (seenFeatures.has(key))
    return

  seenFeatures.add(key)

  features.push({
    feature: featureName,
    location: {
      file: filePath,
      line: loc.start.line,
      column: loc.start.column + 1,
    },
    syntax,
  })
}
