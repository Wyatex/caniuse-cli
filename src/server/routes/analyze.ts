import Elysia from 'elysia';
import { scanFiles, analyzeFile, calculateBrowserSupport } from '../../scanner';
import { join, relative } from 'path';
import { existsSync, statSync } from 'fs';
import type { FileAnalysisResult } from '../websocket';

// Cache for analysis results
const analysisCache = new Map<string, FileAnalysisResult>();

// Store connected clients - using any for Elysia's ServerWebSocket
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wsClients = new Set<any>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerWSClient(ws: any): void {
  wsClients.add(ws);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unregisterWSClient(ws: any): void {
  wsClients.delete(ws);
}

export function analyzeRoute(targetDir: string) {
  return new Elysia({ prefix: '/api' })
    .post('/analyze', async ({ body }) => {
      const { path } = body as { path: string };

      if (!path) {
        return { success: false, error: 'Path is required' };
      }

      const absolutePath = path.startsWith(targetDir) ? path : join(targetDir, path);

      if (!existsSync(absolutePath)) {
        return { success: false, error: 'Path does not exist' };
      }

      const stats = statSync(absolutePath);

      if (stats.isDirectory()) {
        // Analyze directory asynchronously with WebSocket progress
        analyzeDirectory(absolutePath, targetDir);
        return { success: true, message: 'Analysis started' };
      } else {
        // Analyze single file
        const relativePath = relative(targetDir, absolutePath);
        const features = analyzeFile(absolutePath);
        const result = calculateBrowserSupport(features, absolutePath, relativePath);

        const analysisResult: FileAnalysisResult = {
          path: result.path,
          relativePath: result.relativePath,
          features: result.features,
          browserSupport: result.browserSupport,
          minVersions: result.minVersions,
        };

        // Cache the result
        analysisCache.set(absolutePath, analysisResult);

        return { success: true, data: analysisResult };
      }
    })
    .get('/analyze/file', ({ query }) => {
      try {
        // Handle query parameter - can be string or array
        const pathParam = query.path;
        const path = Array.isArray(pathParam) ? pathParam[0] : pathParam;

        if (!path || typeof path !== 'string') {
          return { success: false, error: 'Path is required' };
        }

        const absolutePath = path.startsWith(targetDir) ? path : join(targetDir, path);

        // Check cache first
        const cached = analysisCache.get(absolutePath);
        if (cached) {
          return { success: true, data: cached };
        }

        // Analyze if not in cache
        if (!existsSync(absolutePath)) {
          return { success: false, error: 'File does not exist' };
        }

        const relativePath = relative(targetDir, absolutePath);
        const features = analyzeFile(absolutePath);
        const result = calculateBrowserSupport(features, absolutePath, relativePath);

        const analysisResult: FileAnalysisResult = {
          path: result.path,
          relativePath: result.relativePath,
          features: result.features,
          browserSupport: result.browserSupport,
          minVersions: result.minVersions,
        };

        analysisCache.set(absolutePath, analysisResult);

        return { success: true, data: analysisResult };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Analysis error:', error);
        return { success: false, error: message };
      }
    })
    .get('/analyze/cache', () => {
      // Return all cached results
      const results = Array.from(analysisCache.values());
      return { success: true, data: results };
    })
    .get('/analyze/cache/clear', () => {
      analysisCache.clear();
      return { success: true, message: 'Cache cleared' };
    });
}

function broadcast(data: unknown): void {
  const message = JSON.stringify(data);
  wsClients.forEach((client) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (client.readyState === 1) {
      // WebSocket.OPEN = 1
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      client.send(message);
    }
  });
}

async function analyzeDirectory(dirPath: string, rootDir: string): Promise<void> {
  try {
    const { files, total } = await scanFiles(dirPath);
    const results: FileAnalysisResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const relativePath = relative(rootDir, file);

      // Broadcast progress
      broadcast({
        type: 'progress',
        current: i + 1,
        total,
        currentFile: relativePath,
        percentage: Math.round(((i + 1) / total) * 100),
      });

      // Analyze file
      const features = analyzeFile(file);
      const result = calculateBrowserSupport(features, file, relativePath);

      const analysisResult: FileAnalysisResult = {
        path: result.path,
        relativePath: result.relativePath,
        features: result.features,
        browserSupport: result.browserSupport,
        minVersions: result.minVersions,
      };

      results.push(analysisResult);
      analysisCache.set(file, analysisResult);
    }

    // Broadcast complete
    broadcast({
      type: 'complete',
      results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    broadcast({
      type: 'error',
      message: errorMessage,
    });
  }
}
