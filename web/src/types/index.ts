export interface TreeNode {
  name: string
  path: string
  relativePath: string
  type: 'file' | 'directory'
  children?: TreeNode[]
  extension?: string
}

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

export interface ProgressMessage {
  type: 'progress'
  current: number
  total: number
  currentFile: string
  percentage: number
}

export interface CompleteMessage {
  type: 'complete'
  results: FileAnalysis[]
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export type WSMessage = ProgressMessage | CompleteMessage | ErrorMessage
