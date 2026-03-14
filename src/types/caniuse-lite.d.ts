declare module 'caniuse-lite/data/features' {
  interface FeatureData {
    title: string;
    stats: {
      [browser: string]: {
        [version: string]: string;
      };
    };
  }

  const features: Record<string, FeatureData>;
  export default features;
}

declare module 'caniuse-lite' {
  export function feature(jsFeature: string): {
    title: string;
    stats: {
      [browser: string]: {
        [version: string]: string;
      };
    };
  };
}
