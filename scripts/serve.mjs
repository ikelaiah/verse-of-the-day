import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);
function isPrivateSegment(segment) {
  const normalized = segment.toLowerCase();
  return normalized.startsWith('.') || normalized === 'node_modules';
}

function respond(response, status, message, headOnly = false) {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' });
  response.end(headOnly ? undefined : message);
}

export function createStaticServer(root = process.cwd(), { basePath = '' } = {}) {
  const mountPath = `/${String(basePath).split('/').filter(Boolean).join('/')}`.replace(/^\/$/, '');
  return createServer(async (request, response) => {
    const headOnly = request.method === 'HEAD';
    if (request.method !== 'GET' && !headOnly) {
      response.setHeader('allow', 'GET, HEAD');
      respond(response, 405, 'Method not allowed', headOnly);
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      respond(response, 400, 'Bad request', headOnly);
      return;
    }

    if (mountPath) {
      if (pathname === mountPath) pathname = '/';
      else if (pathname.startsWith(`${mountPath}/`)) pathname = pathname.slice(mountPath.length);
      else {
        respond(response, 404, 'Not found', headOnly);
        return;
      }
    }

    const segments = pathname.split(/[\\/]+/).filter(Boolean);
    if (segments.some(isPrivateSegment)) {
      respond(response, 404, 'Not found', headOnly);
      return;
    }

    const rootPath = await realpath(root);
    const target = resolve(rootPath, `.${pathname === '/' ? '/index.html' : pathname}`);
    const targetRelative = relative(rootPath, target);
    if (targetRelative === '..' || targetRelative.startsWith(`..${sep}`) || targetRelative.includes(`..${sep}`)) {
      respond(response, 404, 'Not found', headOnly);
      return;
    }

    try {
      const actualPath = await realpath(target);
      const actualRelative = relative(rootPath, actualPath);
      if (actualRelative === '..' || actualRelative.startsWith(`..${sep}`)) {
        respond(response, 404, 'Not found', headOnly);
        return;
      }
      if (actualRelative.split(sep).some(isPrivateSegment)) {
        respond(response, 404, 'Not found', headOnly);
        return;
      }

      const info = await stat(actualPath);
      if (!info.isFile()) {
        respond(response, 404, 'Not found', headOnly);
        return;
      }

      response.writeHead(200, {
        'content-length': info.size,
        'content-type': CONTENT_TYPES.get(extname(actualPath).toLowerCase()) || 'application/octet-stream',
        'x-content-type-options': 'nosniff',
      });
      if (headOnly) response.end();
      else createReadStream(actualPath).pipe(response);
    } catch {
      respond(response, 404, 'Not found', headOnly);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const hostIndex = args.indexOf('--host');
  const portIndex = args.indexOf('--port');
  const host = hostIndex >= 0 ? args[hostIndex + 1] : '127.0.0.1';
  const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 8765;

  if (!host || !Number.isInteger(port) || port < 0 || port > 65535) {
    process.stderr.write('Usage: npm run dev -- [--host 127.0.0.1] [--port 8765]\n');
    process.exitCode = 2;
  } else {
    const server = createStaticServer();
    const shutdown = () => {
      server.close(() => process.exit(0));
      server.closeAllConnections();
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
    server.listen(port, host, () => {
      const address = server.address();
      process.stdout.write(`Verse of the Day: http://${host}:${address.port}/\n`);
    });
  }
}
