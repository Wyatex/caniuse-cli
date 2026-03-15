#!/usr/bin/env bun

import { resolve } from 'node:path'
import { program } from 'commander'
import { createServer } from './server'
import { openBrowser } from './utils/openBrowser'

const VERSION = '1.0.0'

program
  .name('caniuse-cli')
  .description('CLI tool to analyze browser compatibility of your project')
  .version(VERSION)
  .argument('[directory]', 'Directory to analyze', process.cwd())
  .option('-p, --port <number>', 'Server port', '3000')
  .option('-o, --open', 'Open browser automatically', true)
  .option('--no-open', 'Do not open browser automatically')
  .action(async (directory: string, options: { port: string, open: boolean }) => {
    const targetDir = resolve(directory)
    const port = Number.parseInt(options.port, 10)

    if (Number.isNaN(port) || port < 1 || port > 65535) {
      console.error('Invalid port number:', options.port)
      process.exit(1)
    }

    console.log('\n🚀 caniuse-cli - Browser Compatibility Analyzer\n')
    console.log(`📁 Target directory: ${targetDir}`)
    console.log(`🌐 Server port: ${port}`)
    console.log('')

    try {
      const server = createServer({ port, targetDir })
      server.start()

      const url = `http://localhost:${port}`

      if (options.open) {
        console.log(`🌍 Opening browser at ${url}`)
        await openBrowser(url).catch((err) => {
          console.warn('Failed to open browser:', err.message)
          console.log(`Please open ${url} manually`)
        })
      }
      else {
        console.log(`🌐 Server ready at ${url}`)
      }

      console.log('\nPress Ctrl+C to stop the server\n')
    }
    catch (error) {
      console.error('Failed to start server:', error)
      process.exit(1)
    }
  })

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...')
  process.exit(0)
})

program.parse()
