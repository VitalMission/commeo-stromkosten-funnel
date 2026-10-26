import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adminHandler from './api/admin.js';
import leadHandler from './api/lead.js';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Never called. On Vercel's Node preset this server is bundled as a function, and the bundler only ships
 * files it sees read at a fixed path -- `path.resolve(root, rel)` below is built per request, so without
 * this the pages, styles, scripts and images never reached the function and every one of them answered
 * "Not found". Listing them as fs reads is what makes the bundler include them (neither a bare
 * `new URL()` nor vercel.json `includeFiles` did, on this preset). Add a file here when the site gains one.
 */
// eslint-disable-next-line no-unused-vars
function bundledPageFiles() {
  return [
    fs.readFileSync(new URL('./index.html', import.meta.url)),
    fs.readFileSync(new URL('./check.html', import.meta.url)),
    fs.readFileSync(new URL('./danke.html', import.meta.url)),
    fs.readFileSync(new URL('./styles.css', import.meta.url)),
    fs.readFileSync(new URL('./main.js', import.meta.url)),
    fs.readFileSync(new URL('./quiz.js', import.meta.url)),
    fs.readFileSync(new URL('./consent.js', import.meta.url)),
    fs.readFileSync(new URL('./danke.js', import.meta.url)),
    fs.readFileSync(new URL('./tracking.js', import.meta.url)),
    fs.readFileSync(new URL('./google-ads.js', import.meta.url)),
    fs.readFileSync(new URL('./commeo-logo.png', import.meta.url)),
    fs.readFileSync(new URL('./ecs.png', import.meta.url)),
    fs.readFileSync(new URL('./hero-bg.png', import.meta.url)),
    fs.readFileSync(new URL('./hero-industrial-v2.png', import.meta.url)),
    fs.readFileSync(new URL('./powermagic.png', import.meta.url)),
    fs.readFileSync(new URL('./powermaster.png', import.meta.url)),
    fs.readFileSync(new URL('./powerup.png', import.meta.url)),
    fs.readFileSync(new URL('./v2/index.html', import.meta.url)),
    fs.readFileSync(new URL('./v2/funnel.js', import.meta.url)),
    fs.readFileSync(new URL('./v2/funnel.css', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/commeo-logo-negativ.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/hebel-peak.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/hebel-pv.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/hebel-strom.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/icon-check.svg', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/ref-billx.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/ref-boehme.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/ref-fitness.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/ref-goeckemeyer.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/ref-ringhotel.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/ref-soprema.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/ref-tortenschmied.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/ref-wilo.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/sys-cube.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/sys-e2315.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/sys-e5.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/sys-ecs.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/sys-powerbackup.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/sys-powermagic.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/sys-powersecure.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/sys-powerup.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/windpark-1480.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/img/windpark-760.webp', import.meta.url)),
    fs.readFileSync(new URL('./v2/fonts/barlow-400.woff2', import.meta.url)),
    fs.readFileSync(new URL('./v2/fonts/barlow-500.woff2', import.meta.url)),
    fs.readFileSync(new URL('./v2/fonts/barlow-700.woff2', import.meta.url))
  ];
}
const args = process.argv.slice(2);
const p = args.indexOf('--port');
const port = p > -1 ? Number(args[p + 1]) : Number(process.env.PORT) || 4173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

/**
 * The API handlers are written against Vercel's req/res, which adds status(),
 * send() and json() on top of node:http. This project deploys with the Node
 * preset, so server.mjs answers every request and a `api/` directory is never
 * picked up as serverless functions -- the three methods are added here instead
 * of rewriting the handlers, so the same files would still work unchanged if
 * the project ever moves to the static + functions preset.
 */
function withVercelResponse(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.send = body => { res.end(body); return res; };
  res.json = value => {
    if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
    return res;
  };
  return res;
}

const ROUTES = {
  '/admin': adminHandler,
  '/api/admin': adminHandler,
  '/api/lead': leadHandler
};

http.createServer(async (req, res) => {
  const clean = decodeURIComponent((req.url || '/').split('?')[0]);

  const handler = ROUTES[clean.replace(/\/$/, '') || '/'];
  if (handler) {
    try {
      return await handler(req, withVercelResponse(res));
    } catch (error) {
      console.error(`${clean} failed`, error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Internal error');
      }
      return;
    }
  }

  // Directory URLs that serve a page; /v2 is the second funnel (v2/index.html).
  const PAGES = { '/': 'index.html', '/v2': 'v2/index.html', '/v2/': 'v2/index.html' };
  const rel = PAGES[clean] ?? clean.replace(/^\//, '');
  const file = path.resolve(root, rel);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, '0.0.0.0', () => console.log(`COMM funnel running on ${port}`));
