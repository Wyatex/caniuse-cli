export interface ProgressMessage {
  type: 'progress';
  current: number;
  total: number;
  currentFile: string;
  percentage: number;
}

export interface CompleteMessage {
  type: 'complete';
  results: FileAnalysisResult[];
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type WSMessage = ProgressMessage | CompleteMessage | ErrorMessage;

export interface FileAnalysisResult {
  path: string;
  relativePath: string;
  features: Array<{
    feature: string;
    location: {
      file: string;
      line: number;
      column: number;
    };
    syntax: string;
  }>;
  browserSupport: Array<{
    browser: string;
    minVersion: string;
    currentFeature: string;
  }>;
  minVersions: {
    chrome: string;
    firefox: string;
    safari: string;
    edge: string;
  };
}
