/**
 * Data source loaders for browser compatibility data.
 *
 * Supports three data sources:
 * 1. @babel/compat-data - Syntax features (accurate minimum versions)
 * 2. caniuse-lite - API features (wide coverage)
 * 3. core-js-compat - Polyfill modules (detailed versions)
 */
import babelPlugins from '@babel/compat-data/plugins'
import { feature as unpackFeature } from 'caniuse-lite'
import caniuseFeatures from 'caniuse-lite/data/features'
import corejsData from 'core-js-compat/data'
import bcd from '@mdn/browser-compat-data'

export interface BrowserVersions {
  chrome?: string
  firefox?: string
  safari?: string
  edge?: string
  ie?: string
}

/**
 * Get browser support data from @babel/compat-data for syntax features.
 * Returns accurate minimum browser versions for syntax transforms.
 */
export function getBabelPluginSupport(
  pluginName: string,
): BrowserVersions | null {
  const data = babelPlugins[pluginName as keyof typeof babelPlugins]
  if (!data) return null

  const result: BrowserVersions = {}

  // @babel/compat-data uses browser names like 'chrome', 'firefox', etc.
  if (data.chrome) result.chrome = normalizeVersion(data.chrome)
  if (data.firefox) result.firefox = normalizeVersion(data.firefox)
  if (data.safari) result.safari = normalizeVersion(data.safari)
  if (data.edge) result.edge = normalizeVersion(data.edge)

  return result
}

/**
 * Get browser support data from caniuse-lite.
 */
export function getCanIUseSupport(featureId: string): BrowserVersions | null {
  try {
    const packedData = (caniuseFeatures as Record<string, any>)[featureId]
    if (!packedData) return null

    // Decode the packed data using caniuse-lite's feature function
    const featureData = unpackFeature(packedData)
    if (!featureData || !featureData.stats) return null

    const result: BrowserVersions = {}
    const stats = featureData.stats

    // Extract minimum version for each browser
    const browsers = ['chrome', 'firefox', 'safari', 'edge'] as const
    for (const browser of browsers) {
      const browserStats = stats[browser]
      if (browserStats) {
        const minVersion = findMinSupportedVersion(browserStats)
        if (minVersion) {
          result[browser] = minVersion
        }
      }
    }

    return result
  } catch {
    return null
  }
}

/**
 * Get browser support data from core-js-compat.
 * @todo: 如果moduleData是{}或者undefined，去@mdn/browser-compat-data找数据
 */
export function getCoreJSSupport(moduleName: string): BrowserVersions | null {
  try {
    const moduleData = corejsData[
      moduleName
    ]
    if (moduleData && Object.keys(moduleData).length !== 0) {
      const result: BrowserVersions = {}

      // core-js-compat uses browser names
      const browsers = ['chrome', 'firefox', 'safari', 'edge'] as const
      for (const browser of browsers) {
        const version = moduleData[browser]
        if (version) {
          result[browser] = normalizeVersion(version)
        }
      }

      return result
    } else {
      const [_, className, method] = moduleName.split('.')
      const moduleData = bcd.javascript?.builtins?.[className!.charAt(0).toUpperCase() + className!.slice(1)]?.[method!]?.__compat?.support
      if (moduleData) {
        const result: BrowserVersions = {}
        const browsers = ['chrome', 'firefox', 'safari', 'edge'] as const
        for (const browser of browsers) {
          const browserInfo = moduleData[browser]
          if (browserInfo) {
            const version = browserInfo.version_added
            if (version) {
              result[browser] = normalizeVersion(version)
            }
          }
        }
        return result
      }
      return null
    }
    // core-js-compat 找不到，去@mdn/browser-compat-data找数据
  } catch {
    return null
  }
}

/**
 * Find the minimum supported version from caniuse-lite stats.
 * Stats format: { "1": "n", "2": "n", ..., "80": "y", ... }
 * 'y' = supported, 'n' = not supported, 'a' = partial support
 */
function findMinSupportedVersion(stats: Record<string, string>): string | null {
  const entries = Object.entries(stats)
  const supportedVersions: string[] = []

  for (const [version, support] of entries) {
    // Skip preview/beta versions like 'TP', 'preview', 'all'
    if (version === 'TP' || version === 'preview' || version === 'all') continue

    // 'y' = supported, 'a' = partial support (treat as supported)
    if (support.startsWith('y') || support.startsWith('a')) {
      supportedVersions.push(version)
    }
  }

  if (supportedVersions.length === 0) return null

  // Sort and return minimum
  supportedVersions.sort(compareVersionStrings)
  return normalizeVersion(supportedVersions[0]!)
}

/**
 * Compare two version strings for sorting.
 */
function compareVersionStrings(a: string, b: string): number {
  const aParts = a.split('.').map((p) => Number.parseInt(p, 10) || 0)
  const bParts = b.split('.').map((p) => Number.parseInt(p, 10) || 0)

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0
    const bVal = bParts[i] ?? 0
    if (aVal !== bVal) return aVal - bVal
  }
  return 0
}

/**
 * Normalize version strings.
 * E.g., "80.0" -> "80", "12.1-12.2" -> "12.1", "TP" -> "preview"
 */
function normalizeVersion(version: string): string {
  if (version === 'all') return 'all'
  if (version === 'preview' || version === 'TP') return 'preview'

  // Handle range versions like "12.1-12.2"
  if (version.includes('-')) {
    return version.split('-')[0] ?? version
  }

  // Remove trailing .0
  const parts = version.split('.')
  if (parts.length > 1 && parts.at(-1) === '0') {
    parts.pop()
  }

  return parts.join('.')
}
