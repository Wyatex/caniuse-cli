import bcd from '@mdn/browser-compat-data'

const moduleName = 'esnext.map.merge'

const [_, className, method] = moduleName.split('.')
const moduleData =
  bcd.javascript?.builtins?.[
    className!.charAt(0).toUpperCase() + className!.slice(1)
  ]?.[method!]?.__compat?.support
if (moduleData) {
  const result = {} as any
  const browsers = ['chrome', 'firefox', 'safari', 'edge'] as const
  for (const browser of browsers) {
    const browserInfo = moduleData[browser]
    if (browserInfo) {
      const version = browserInfo.version_added
      if (version) {
        result[browser] = version
      }
    }
  }
  console.log(result)
}

console.log('done')