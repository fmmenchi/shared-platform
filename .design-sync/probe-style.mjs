// Decisive check: is the component CSS actually applying in a preview page?
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] ?? './ds-bundle';
const PAGE = process.argv[3] ?? '/components/buttons/Button/Button.html';
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p)) {
    res.writeHead(404);
    return res.end('nope');
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(p)] ?? 'application/octet-stream',
  });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
const failed = [];
page.on('requestfailed', (r) =>
  failed.push(r.url().replace(`http://localhost:${port}`, '')),
);
page.on('response', (r) => {
  if (r.status() >= 400)
    failed.push(
      `${r.status()} ${r.url().replace(`http://localhost:${port}`, '')}`,
    );
});
await page.goto(`http://localhost:${port}${PAGE}`, {
  waitUntil: 'networkidle',
});
await page.waitForTimeout(500);

const info = await page.evaluate(() => {
  const btn = document.querySelector('button');
  const allButtons = [...document.querySelectorAll('button')]
    .slice(0, 6)
    .map((b) => b.className);
  const hashedInDom = document.querySelectorAll('[class*="_button_"]').length;
  const probe = getComputedStyle(document.documentElement);
  const sheets = [...document.styleSheets].map((s) => {
    try {
      return `${(s.href || 'inline').split('/').pop()}: ${s.cssRules.length} rules`;
    } catch (e) {
      return `${(s.href || 'inline').split('/').pop()}: BLOCKED (${e.name})`;
    }
  });
  const tokens = {
    tokenPrimary: probe.getPropertyValue('--fm-color-primary').trim(),
    tokenSpace: probe.getPropertyValue('--fm-space-inset-m').trim(),
  };
  if (!btn)
    return {
      found: false,
      sheets,
      ...tokens,
      body: document.body.innerHTML.slice(0, 200),
    };
  const cs = getComputedStyle(btn);
  return {
    found: true,
    className: btn.className,
    background: cs.backgroundColor,
    color: cs.color,
    padding: cs.paddingInline || cs.paddingLeft,
    radius: cs.borderRadius,
    sheets,
    allButtons,
    hashedInDom,
    ...tokens,
  };
});
console.log(
  JSON.stringify({ failedRequests: failed.slice(0, 8), ...info }, null, 2),
);
await browser.close();
server.close();
