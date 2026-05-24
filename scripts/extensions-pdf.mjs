#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const DOCS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(DOCS_ROOT, '.vitepress', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

function staticServer(root) {
  return createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      let file = join(root, p);
      if (!existsSync(file) && existsSync(file + '.html')) file += '.html';
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
}

async function main() {
  if (!existsSync(join(DIST, 'extensions'))) {
    console.log('no built extensions/ - run vitepress build first'); return;
  }
  const slugs = (await readdir(join(DIST, 'extensions')))
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .map((f) => f.replace(/\.html$/, ''));
  if (slugs.length === 0) { console.log('no extension pages to render'); return; }

  const server = staticServer(DIST);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  await mkdir(join(DIST, 'pdf'), { recursive: true });
  try {
    for (const slug of slugs) {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${port}/extensions/${slug}.html`, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: join(DIST, 'pdf', `${slug}.pdf`),
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
      });
      await page.close();
      console.log(`pdf: ${slug}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
