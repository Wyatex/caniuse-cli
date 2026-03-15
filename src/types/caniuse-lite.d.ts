declare module 'caniuse-lite/data/features' {
  interface FeatureData {
    title: string
    stats: {
      [browser: string]: {
        [version: string]: string
      }
    }
  }

  const features: Record<string, FeatureData>
  export default features
}

declare module 'caniuse-lite' {
  export function feature(jsFeature: string): {
    title: string
    stats: {
      [browser: string]: {
        [version: string]: string
      }
    }
  }
}

declare module 'core-js-compat/data' {
  const features: Record<string, Partial<{
    'android': string
    'bun': string
    'chrome': string
    'chrome-android': string
    'deno': string
    'edge': string
    'electron': string
    'firefox': string
    'firefox-android': string
    'hermes': string
    'ios': string
    'node': string
    'oculus': string
    'opera': string
    'opera-android': string
    'opera_mobile': string
    'quest': string
    'react-native': string
    'rhino': string
    'safari': string
    'samsung': string
  }>>
  export default features
}

declare module '@babel/compat-data/plugins' {
  const features: Record<string, Partial<{
    chrome: string
    opera: string
    edge: string
    firefox: string
    safari: string
    node: string
    deno: string
    ios: string
    samsung: string
    opera_mobile: string
    electron: string
  }>>
  export default features
}
