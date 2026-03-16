import type { CodeFeature } from './astAnalyzer'
import type { BrowserVersions } from './dataSources'
import bcd from '@mdn/browser-compat-data'
import {

  getBabelPluginSupport,
  getCoreJSSupport,
} from './dataSources'

export interface BrowserSupport {
  browser: string
  minVersion: string
  currentFeature: string
}

export interface MinVersions {
  chrome: string
  firefox: string
  safari: string
  edge: string
}

export interface FileAnalysis {
  path: string
  relativePath: string
  features: CodeFeature[]
  browserSupport: BrowserSupport[]
  minVersions: MinVersions
}

// 新增从 MDN 读取支持的帮助函数
function getMdnSupport(apiName?: string): BrowserVersions | null {
  if (!apiName) {
    return null
  }
  try {
    const apiData = bcd.api[apiName]
    if (!apiData || !apiData.__compat)
      return null

    const support = apiData.__compat.support

    // MDN 的版本数据有时候是个数组（包含历史），这里取第一个版本的 version_added
    const getVer = (browserInfo: any) => {
      if (!browserInfo)
        return undefined
      const info = Array.isArray(browserInfo) ? browserInfo[0] : browserInfo
      return typeof info.version_added === 'string' ? info.version_added : undefined
    }

    return {
      chrome: getVer(support.chrome),
      firefox: getVer(support.firefox),
      safari: getVer(support.safari),
      edge: getVer(support.edge),
    }
  }
  catch {
    return null
  }
}

// 1. 补回专属于“语法”的映射字典
const SYNTAX_MAP: Record<string, string> = {
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

// 2. 补回极少数不在 Babel 转换范畴内，且数据源很难查的特定语法
const MANUAL_SYNTAX_VERSIONS: Record<string, BrowserVersions> = {
  'top-level-await': { chrome: '89', firefox: '89', safari: '15', edge: '89' },
  'bigint': { chrome: '67', firefox: '68', safari: '14', edge: '79' },
  'dynamic-import': { chrome: '63', firefox: '67', safari: '11.1', edge: '79' },
}

/**
 * Get browser support for a feature using the data source priority:
 * 1. Manual fallback (for features not in any data source)
 * 2. @babel/compat-data (syntax features)
 * 3. caniuse-lite (API features)
 * 4. core-js-compat (polyfill modules)
 */
function getFeatureSupport(featureName: string): BrowserVersions | null {
  // 0. 手动指定的特性 (如 top-level-await)
  if (MANUAL_SYNTAX_VERSIONS[featureName]) {
    return MANUAL_SYNTAX_VERSIONS[featureName]
  }

  // 1. 语法特性映射 (例如将 arrow-functions 自动转换为 transform-arrow-functions)
  const babelPlugin = SYNTAX_MAP[featureName] || featureName
  if (babelPlugin.startsWith?.('transform-') || babelPlugin.startsWith?.('proposal-')) {
    const support = getBabelPluginSupport(babelPlugin)
    if (support)
      return support
  }

  // 2. core-js API 特性 (例如 es.array.find-last)
  if (featureName.startsWith?.('es.') || featureName.startsWith?.('esnext.')) {
    const support = getCoreJSSupport(featureName)
    if (support)
      return support
  }

  // 3. MDN DOM/BOM API (例如 api.IntersectionObserver)
  if (featureName.startsWith?.('api.')) {
    const apiName = featureName.split('.')[1]
    return getMdnSupport(apiName)
  }

  return null
}

// Compare two version strings
function compareVersions(a: string, b: string): number {
  if (a === 'N/A')
    return -1
  if (b === 'N/A')
    return 1
  if (a === 'all')
    return 1
  if (b === 'all')
    return -1
  if (a === 'preview')
    return -1
  if (b === 'preview')
    return 1

  const aParts = a.split('.').map(Number)
  const bParts = b.split('.').map(Number)

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0
    const bVal = bParts[i] ?? 0

    if (aVal > bVal)
      return 1
    if (aVal < bVal)
      return -1
  }

  return 0
}

// Get the maximum (highest minimum) version across browsers
function getMaxVersion(versions: string[]): string {
  let max = '0'

  for (const version of versions) {
    if (compareVersions(version, max) > 0) {
      max = version
    }
  }

  return max
}

export function calculateBrowserSupport(features: CodeFeature[], filePath: string, relativePath: string): FileAnalysis {
  const browserSupport: BrowserSupport[] = []
  const aggregatedVersions: Record<string, string[]> = {
    chrome: [],
    firefox: [],
    safari: [],
    edge: [],
  }

  // Add maxVersion to each feature for sorting
  for (const feature of features) {
    const support = getFeatureSupport(feature.feature)

    // 没查到的不展示
    if (!support) {
      continue
    }

    // Calculate max version across browsers for this feature
    const versions = Object.values(support).filter((v): v is string => v !== undefined && v !== 'N/A')
    if (versions.length > 0) {
      feature.maxVersion = getMaxVersion(versions)
    }

    for (const [browser, version] of Object.entries(support)) {
      if (version !== undefined && version !== 'N/A' && version !== '0') {
        aggregatedVersions[browser] = aggregatedVersions[browser] ?? []
        aggregatedVersions[browser]!.push(version)

        browserSupport.push({
          browser,
          minVersion: version,
          currentFeature: feature.feature,
        })
      }
    }
  }

  // Calculate the minimum required version for each browser
  const minVersions: MinVersions = {
    chrome: getMaxVersion(aggregatedVersions.chrome ?? ['0']),
    firefox: getMaxVersion(aggregatedVersions.firefox ?? ['0']),
    safari: getMaxVersion(aggregatedVersions.safari ?? ['0']),
    edge: getMaxVersion(aggregatedVersions.edge ?? ['0']),
  }

  return {
    path: filePath,
    relativePath,
    features,
    browserSupport,
    minVersions,
  }
}

// Aggregate multiple file analyses into a single result
export function aggregateAnalyses(analyses: FileAnalysis[]): FileAnalysis {
  if (analyses.length === 0) {
    return {
      path: '',
      relativePath: '',
      features: [],
      browserSupport: [],
      minVersions: { chrome: '0', firefox: '0', safari: '0', edge: '0' },
    }
  }

  const allFeatures: CodeFeature[] = []
  const allBrowserSupport: BrowserSupport[] = []
  const aggregatedVersions: Record<string, string[]> = {
    chrome: [],
    firefox: [],
    safari: [],
    edge: [],
  }

  for (const analysis of analyses) {
    allFeatures.push(...analysis.features)
    allBrowserSupport.push(...analysis.browserSupport)

    for (const [browser, version] of Object.entries(analysis.minVersions)) {
      if (version !== '0') {
        aggregatedVersions[browser] = aggregatedVersions[browser] ?? []
        aggregatedVersions[browser]!.push(version)
      }
    }
  }

  const minVersions: MinVersions = {
    chrome: getMaxVersion(aggregatedVersions.chrome ?? ['0']),
    firefox: getMaxVersion(aggregatedVersions.firefox ?? ['0']),
    safari: getMaxVersion(aggregatedVersions.safari ?? ['0']),
    edge: getMaxVersion(aggregatedVersions.edge ?? ['0']),
  }

  return {
    path: analyses[0]?.path ?? '',
    relativePath: analyses[0]?.relativePath ?? '',
    features: allFeatures,
    browserSupport: allBrowserSupport,
    minVersions,
  }
}
