import type { CodeFeature } from './astAnalyzer';

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

// Feature name mapping from our internal names to caniuse-lite feature IDs
const FEATURE_TO_CANIUSE: Record<string, string> = {
  'arrow-functions': 'arrow-functions',
  'es6-class': 'es6-class',
  'template-literals': 'template-literals',
  'spread-operator': 'es6-spread',
  'rest-parameters': 'rest-parameters',
  'destructuring': 'destructuring',
  'async-functions': 'async-functions',
  'optional-chaining': 'optional-chaining',
  'nullish-coalescing': 'nullish-coalescing',
  'bigint': 'bigint',
  'logical-assignment': 'logical-assignment-operators',
  'class-static-block': 'class-static-block',
  'private-class-fields': 'private-class-fields',
  'generators': 'generators',
  'dynamic-import': 'es6-module-dynamic-import',
  'es2023-array-methods': 'es2023-array-methods',
  'top-level-await': 'top-level-await',
};

// Browser name mapping
const BROWSER_MAP: Record<string, string> = {
  chrome: 'chrome',
  firefox: 'firefox',
  safari: 'safari',
  edge: 'edge',
};

// Known browser version requirements for features
// This is a fallback if caniuse-lite data is not available
const KNOWN_FEATURE_VERSIONS: Record<string, Record<string, string>> = {
  'arrow-functions': { chrome: '45', firefox: '22', safari: '10', edge: '12' },
  'es6-class': { chrome: '49', firefox: '45', safari: '9', edge: '13' },
  'template-literals': { chrome: '41', firefox: '34', safari: '9', edge: '13' },
  'es6-spread': { chrome: '46', firefox: '16', safari: '8', edge: '12' },
  'rest-parameters': { chrome: '47', firefox: '15', safari: '10', edge: '12' },
  'destructuring': { chrome: '51', firefox: '53', safari: '8', edge: '12' },
  'async-functions': { chrome: '55', firefox: '52', safari: '11', edge: '15' },
  'optional-chaining': { chrome: '80', firefox: '74', safari: '13.1', edge: '80' },
  'nullish-coalescing': { chrome: '80', firefox: '72', safari: '13.1', edge: '80' },
  'bigint': { chrome: '67', firefox: '68', safari: '14', edge: '79' },
  'logical-assignment-operators': { chrome: '85', firefox: '79', safari: '14', edge: '85' },
  'class-static-block': { chrome: '94', firefox: '90', safari: '16.4', edge: '94' },
  'private-class-fields': { chrome: '74', firefox: '90', safari: '14.1', edge: '79' },
  'generators': { chrome: '39', firefox: '26', safari: '10', edge: '13' },
  'es6-module-dynamic-import': { chrome: '63', firefox: '57', safari: '11.1', edge: '79' },
  'es2023-array-methods': { chrome: '110', firefox: '115', safari: '16', edge: '110' },
  'top-level-await': { chrome: '89', firefox: '89', safari: '15', edge: '89' },
};

// Get the minimum version that supports a feature
function getMinSupportVersion(featureId: string): Record<string, string> {
  // First try our known versions
  const knownVersions = KNOWN_FEATURE_VERSIONS[featureId];
  if (knownVersions) {
    return { ...knownVersions };
  }

  // Fallback: try to load from caniuse-lite
  try {
    // Dynamic require for Bun/Node compatibility
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const featuresData = require('caniuse-lite/data/features');
    const featureData = featuresData[featureId];

    if (featureData && featureData.stats) {
      const stats = featureData.stats;
      const result: Record<string, string> = {};

      for (const [browser, versionData] of Object.entries(stats)) {
        const mappedBrowser = BROWSER_MAP[browser];
        if (!mappedBrowser) continue;

        // Find the first version that supports the feature (starts with 'y')
        const versions = Object.entries(versionData as Record<string, string>);
        const supportedVersions = versions.filter(([, support]) => support.startsWith('y'));

        if (supportedVersions.length > 0) {
          const minVersion = supportedVersions[0]![0];
          result[mappedBrowser] = normalizeVersion(minVersion);
        } else {
          result[mappedBrowser] = 'N/A';
        }
      }

      return result;
    }
  } catch (e) {
    // caniuse-lite not available, use defaults
  }

  // Return conservative defaults if feature not found
  return {
    chrome: '1',
    firefox: '1',
    safari: '1',
    edge: '1',
  };
}

// Normalize version strings (e.g., "80.0" -> "80")
function normalizeVersion(version: string): string {
  if (version === 'all') return 'all';
  if (version === 'preview') return 'preview';

  // Handle range versions like "12.1-12.2"
  if (version.includes('-')) {
    return version.split('-')[0] ?? version;
  }

  // Remove trailing .0
  const parts = version.split('.');
  if (parts.length > 1 && parts[parts.length - 1] === '0') {
    parts.pop();
  }

  return parts.join('.');
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

  for (const feature of features) {
    const caniuseId = FEATURE_TO_CANIUSE[feature.feature] ?? feature.feature;
    const support = getMinSupportVersion(caniuseId);

    for (const [browser, version] of Object.entries(support)) {
      if (version !== 'N/A') {
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
