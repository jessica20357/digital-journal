import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 5173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.json': 'application/json; charset=utf-8',
};

try {
  await access(join(root, 'index.html'));
} catch {
  console.error(
    'Build the app first with npm run build, or use the complete local download package.',
  );
  process.exit(1);
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  } catch {
    response.writeHead(400).end('Invalid URL');
    return;
  }
  let filename = resolve(root, `.${pathname}`);
  const inside = relative(root, filename);
  if (inside === '..' || inside.startsWith(`..${sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    let info = await stat(filename);
    if (info.isDirectory()) {
      filename = join(filename, 'index.html');
      info = await stat(filename);
    }
    if (!info.isFile()) throw new Error('Not a file');
    const headers = {
      'Content-Type': types[extname(filename)] || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    };
    let start = 0;
    let end = info.size - 1;
    let status = 200;
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!range || (!range[1] && !range[2])) {
        response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
        return;
      }
      if (range[1]) {
        start = Number(range[1]);
        if (range[2]) end = Math.min(end, Number(range[2]));
      } else {
        const length = Number(range[2]);
        start = length > 0 ? Math.max(0, info.size - length) : info.size;
      }
      if (start > end || start >= info.size) {
        response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
        return;
      }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = String(end - start + 1);
    response.writeHead(status, headers);
    if (request.method === 'HEAD' || info.size === 0) {
      response.end();
      return;
    }
    const stream = createReadStream(filename, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch {
    response.writeHead(404).end('File not found');
  }
});

server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${port} is in use. Stop the other local server or choose another PORT.`
      : error.message,
  );
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Digital Journal: http://127.0.0.1:${port}/`);
  console.log(`banana fish demo: http://127.0.0.1:${port}/demo/`);
  console.log('Keep this terminal open while using the app. Press Ctrl+C to stop.');
});
