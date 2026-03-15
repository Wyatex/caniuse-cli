import Elysia from 'elysia';
import { fileTreeRoute } from './routes/fileTree';
import { analyzeRoute, registerWSClient, unregisterWSClient } from './routes/analyze';
import { openFileRoute } from './routes/openFile';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// MIME types for static files
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

export interface ServerOptions {
  port: number;
  targetDir: string;
}

export function createServer(options: ServerOptions) {
  const { port, targetDir } = options;

  // Determine the web dist directory
  const webDistPath = join(__dirname, '../../web/dist');
  const webDistExists = existsSync(webDistPath);
  const indexPath = join(webDistPath, 'index.html');

  const app = new Elysia();

  // Add CORS headers for development
  app.onRequest(({ request }) => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
  });

  app.onAfterHandle(({ response }) => {
    // Add CORS headers to all responses
    if (response instanceof Response) {
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(response.body, {
        status: response.status,
        headers,
      });
    }
    return response;
  });

  // WebSocket for real-time progress
  app.ws('/ws', {
    open(ws) {
      console.log('WebSocket client connected');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      registerWSClient(ws.raw);
    },
    close(ws) {
      console.log('WebSocket client disconnected');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      unregisterWSClient(ws.raw);
    },
    message(ws, message) {
      console.log('WebSocket message:', message);
    },
  });

  // API routes
  app.use(fileTreeRoute(targetDir));
  app.use(analyzeRoute(targetDir));
  app.use(openFileRoute(targetDir));

  // Serve static files from web/dist if it exists
  console.log('webDistExists:', webDistExists, 'webDistPath:', webDistPath);

  if (webDistExists) {
    // Serve index.html for root
    app.get('/', async () => {
      console.log('Root route hit, serving index.html');
      const indexContent = await Bun.file(indexPath).text();
      console.log('index.html length:', indexContent.length);
      return new Response(indexContent, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    });

    // Serve static files from assets directory
    app.get('/assets/*', async ({ params }) => {
      const filePath = join(webDistPath, 'assets', params['*'] as string);
      const file = Bun.file(filePath);

      if (!(await file.exists())) {
        return new Response('Not Found', { status: 404 });
      }

      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      return new Response(file, {
        headers: {
          'Content-Type': contentType,
        },
      });
    });

    // SPA fallback for all other routes
    app.get('*', async () => {
      const indexContent = await Bun.file(indexPath).text();
      return new Response(indexContent, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    });
  } else {
    // Development mode - serve a simple placeholder
    app.get('/', () => {
      return `<!DOCTYPE html>
<html>
<head>
  <title>caniuse-cli</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #1a1a2e;
      color: #eee;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    h1 { margin-bottom: 10px; }
    p { color: #888; }
    .api-link {
      display: block;
      margin-top: 20px;
      color: #4da6ff;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>caniuse-cli</h1>
    <p>Development mode - Frontend not built</p>
    <p>Run <code>cd web && bun run dev</code> to start Vite dev server</p>
    <a class="api-link" href="/api/file-tree">API: File Tree</a>
  </div>
</body>
</html>`;
    });
  }

  return {
    app,
    start: () => {
      app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Analyzing directory: ${targetDir}`);
      });
      return app;
    },
  };
}
