import { join, normalize } from 'node:path'
import { $ } from 'bun'
import Elysia from 'elysia'

// Check if path is absolute (works with both forward and back slashes on Windows)
function isAbsolutePath(p: string): boolean {
  // Check for Windows absolute paths (C:\, C:/, etc.)
  if (/^[A-Z]:[/\\]/i.test(p)) {
    return true
  }
  // Check for Unix absolute paths
  if (p.startsWith('/')) {
    return true
  }
  return false
}

export function openFileRoute(targetDir: string) {
  return new Elysia({ prefix: '/api' }).get('/open-file', async ({ query }) => {
    const filePath = query.path as string
    const line = query.line ? Number.parseInt(query.line as string, 10) : undefined

    if (!filePath) {
      return {
        success: false,
        error: 'File path is required',
      }
    }

    // Check if filePath is already an absolute path
    const absolutePath = isAbsolutePath(filePath)
      ? normalize(filePath)
      : join(targetDir, filePath)

    try {
      // Use webstorm command to open file with line number
      // The webstorm CLI should be installed and available in PATH
      if (line) {
        await $`webstorm --line ${line} ${absolutePath}`.quiet()
      }
      else {
        await $`webstorm ${absolutePath}`.quiet()
      }
      return { success: true }
    }
    catch (error) {
      console.error('Failed to open file:', error)
      return {
        success: false,
        error: 'Failed to open file with WebStorm. Make sure webstorm CLI is installed.',
      }
    }
  })
}
