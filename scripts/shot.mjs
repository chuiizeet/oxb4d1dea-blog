// Captura de pantalla con Playwright.
//
// Uso:
//   node scripts/shot.mjs <url> <salida.png> [textoAClickear]
//
// Si pasas un tercer argumento, hace clic en el primer elemento que contenga
// ese texto y guarda una segunda captura (<salida>-2.png). Útil para ver
// estados (ej. el toggle "VER MANUSCRITO").

import { chromium } from 'playwright';

const [, , url, out, clickText] = process.argv;
if (!url || !out) {
  console.error('Uso: node scripts/shot.mjs <url> <salida.png> [textoAClickear]');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 860 },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800); // dejar asentar animaciones/fuentes
await page.screenshot({ path: out });
console.log('guardado', out);

if (clickText) {
  await page.getByText(clickText, { exact: false }).first().click();
  await page.waitForTimeout(800);
  const out2 = out.replace(/\.png$/, '-2.png');
  await page.screenshot({ path: out2 });
  console.log('guardado', out2);
}

await browser.close();
