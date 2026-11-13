import { chromium } from "playwright";
const URL = "http://127.0.0.1:8765/index.html";
const PAGES_URL = "https://rth1403.github.io/ursinho/";
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const page = await (await b.newContext()).newPage();
await page.route(/\.supabase\.co\//, route => route.abort());
await page.goto(URL); await page.waitForTimeout(300);

const qr = page.locator("#account .qr-box");
ok(await qr.isVisible(), "tela inicial mostra o QR code");
ok((await qr.locator("svg").count()) === 1, "QR é SVG inline (funciona offline)");
ok((await qr.getAttribute("data-url", { timeout: 1000 }).catch(() => null)) === PAGES_URL, "QR aponta para o GitHub Pages");
ok((await qr.innerText({ timeout: 1000 }).catch(() => "")).includes("rth1403.github.io/ursinho"), "link aparece escrito ao lado do QR");
const { devices } = await import("playwright");
for (const [name, opts] of [["iPhone SE", devices["iPhone SE"]], ["iPhone 13", devices["iPhone 13"]], ["celular deitado", { ...devices["iPhone 13"], viewport: { width: 844, height: 390 } }]]) {
  const m = await (await b.newContext(opts)).newPage();
  await m.route(/\.supabase\.co\//, route => route.abort());
  await m.goto(URL); await m.waitForTimeout(300);
  ok(!(await m.locator("#account .qr-box").isVisible()), `${name}: QR escondido (já está no celular)`);
  // The submit button must be reachable by a user scroll; scrollIntoView would also
  // scroll overflow:hidden boxes and hide the bug.
  await m.mouse.move(opts.viewport.width / 2, opts.viewport.height / 2);
  await m.mouse.wheel(0, 2000); await m.waitForTimeout(300);
  const r = await m.locator("#form .cta").boundingBox();
  const vh = await m.evaluate(() => innerHeight);
  ok(r && r.y >= 0 && r.y + r.height <= vh, `${name}: botão 'Entrar na aventura' alcançável`);
}
await b.close();
