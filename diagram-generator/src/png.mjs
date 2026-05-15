import { editorialStyle } from './style.mjs';

export async function renderPngFiles(items, options = {}) {
  if (!items.length) return;
  const { chromium } = await import('playwright');
  const style = options.style ?? editorialStyle;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: style.width, height: style.height }, deviceScaleFactor: 2 });
    for (const item of items) {
      await page.setContent(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              html, body { margin: 0; width: ${style.width}px; height: ${style.height}px; background: ${style.colors.page}; }
              svg { display: block; width: ${style.width}px; height: ${style.height}px; }
            </style>
          </head>
          <body>${item.svg}</body>
        </html>
      `);
      await page.screenshot({ path: item.outPath, type: 'png' });
    }
  } finally {
    await browser.close();
  }
}
