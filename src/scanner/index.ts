export { scanFiles, getFileTree, buildFileTree, SCAN_PATTERNS, IGNORE_PATTERNS } from './fileScanner';
export type { ScanResult, FileEntry, TreeNode } from './fileScanner';
export { analyzeFile } from './astAnalyzer';
export type { CodeFeature } from './astAnalyzer';
export { calculateBrowserSupport, aggregateAnalyses } from './browserCompat';
export type { BrowserSupport, MinVersions, FileAnalysis } from './browserCompat';
