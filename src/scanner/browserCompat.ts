import type { CodeFeature } from './astAnalyzer';
import {
  SYNTAX_FEATURE_MAP,
  CANIUSE_FEATURE_MAP,
  COREJS_FEATURE_MAP,
  MANUAL_FEATURE_VERSIONS,
} from './featureMappings';
import {
  getBabelPluginSupport,
  getCanIUseSupport,
  getCoreJSSupport,
  type BrowserVersions,
} from './dataSources';

export interface BrowserSupport {
  browser: string;
  minVersion: string;
  currentFeature: string;
}

export interface MinVersions {
  chrome: string;
  firefox: string;
  safari: string;
  edge: string;
}

export interface FileAnalysis {
  path: string;
  relativePath: string;
  features: CodeFeature[];
  browserSupport: BrowserSupport[];
  minVersions: MinVersions;
}

/**
 * Get browser support for a feature using the data source priority:
 * 1. Manual fallback (for features not in any data source)
 * 2. @babel/compat-data (syntax features)
 * 3. caniuse-lite (API features)
 * 4. core-js-compat (polyfill modules)
 */
function getFeatureSupport(featureName: string): BrowserVersions {
  // 1. Check manual fallback first
  const manualVersions = MANUAL_FEATURE_VERSIONS[featureName];
  if (manualVersions) {
    return manualVersions;
  }

  // 2. Try @babel/compat-data for syntax features
  const babelPlugin = SYNTAX_FEATURE_MAP[featureName];
  if (babelPlugin) {
    const support = getBabelPluginSupport(babelPlugin);
    if (support) return support;
  }

  // 3. Try caniuse-lite for API features
  const caniuseId = CANIUSE_FEATURE_MAP[featureName];
  if (caniuseId) {
    const support = getCanIUseSupport(caniuseId);
    if (support) return support;
  }

  // 4. Try core-js-compat for polyfill modules
  const corejsModule = COREJS_FEATURE_MAP[featureName];
  if (corejsModule) {
    const support = getCoreJSSupport(corejsModule);
    if (support) return support;
  }

  // Return conservative defaults if feature not found in any source
  return {
    chrome: '1',
    firefox: '1',
    safari: '1',
    edge: '1',
  };
}

// Compare two version strings
function compareVersions(a: string, b: string): number {
  if (a === 'N/A') return -1;
  if (b === 'N/A') return 1;
  if (a === 'all') return 1;
  if (b === 'all') return -1;
  if (a === 'preview') return -1;
  if (b === 'preview') return 1;

  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;

    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
}

// Get the maximum (highest minimum) version across browsers
function getMaxVersion(versions: string[]): string {
  let max = '0';

  for (const version of versions) {
    if (compareVersions(version, max) > 0) {
      max = version;
    }
  }

  return max;
}

export function calculateBrowserSupport(features: CodeFeature[], filePath: string, relativePath: string): FileAnalysis {
  const browserSupport: BrowserSupport[] = [];
  const aggregatedVersions: Record<string, string[]> = {
    chrome: [],
    firefox: [],
    safari: [],
    edge: [],
  };

  // Add maxVersion to each feature for sorting
  for (const feature of features) {
    const support = getFeatureSupport(feature.feature);

    // Calculate max version across browsers for this feature
    const versions = Object.values(support).filter((v): v is string => v !== undefined && v !== 'N/A');
    if (versions.length > 0) {
      feature.maxVersion = getMaxVersion(versions);
    }

    for (const [browser, version] of Object.entries(support)) {
      if (version !== undefined && version !== 'N/A') {
        aggregatedVersions[browser] = aggregatedVersions[browser] ?? [];
        aggregatedVersions[browser]!.push(version);

        browserSupport.push({
          browser,
          minVersion: version,
          currentFeature: feature.feature,
        });
      }
    }
  }

  // Calculate the minimum required version for each browser
  const minVersions: MinVersions = {
    chrome: getMaxVersion(aggregatedVersions.chrome ?? ['0']),
    firefox: getMaxVersion(aggregatedVersions.firefox ?? ['0']),
    safari: getMaxVersion(aggregatedVersions.safari ?? ['0']),
    edge: getMaxVersion(aggregatedVersions.edge ?? ['0']),
  };

  return {
    path: filePath,
    relativePath,
    features,
    browserSupport,
    minVersions,
  };
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
    };
  }

  const allFeatures: CodeFeature[] = [];
  const allBrowserSupport: BrowserSupport[] = [];
  const aggregatedVersions: Record<string, string[]> = {
    chrome: [],
    firefox: [],
    safari: [],
    edge: [],
  };

  for (const analysis of analyses) {
    allFeatures.push(...analysis.features);
    allBrowserSupport.push(...analysis.browserSupport);

    for (const [browser, version] of Object.entries(analysis.minVersions)) {
      if (version !== '0') {
        aggregatedVersions[browser] = aggregatedVersions[browser] ?? [];
        aggregatedVersions[browser]!.push(version);
      }
    }
  }

  const minVersions: MinVersions = {
    chrome: getMaxVersion(aggregatedVersions.chrome ?? ['0']),
    firefox: getMaxVersion(aggregatedVersions.firefox ?? ['0']),
    safari: getMaxVersion(aggregatedVersions.safari ?? ['0']),
    edge: getMaxVersion(aggregatedVersions.edge ?? ['0']),
  };

  return {
    path: analyses[0]?.path ?? '',
    relativePath: analyses[0]?.relativePath ?? '',
    features: allFeatures,
    browserSupport: allBrowserSupport,
    minVersions,
  };
}
