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
await page.setViewportSize({ width: 375, height: 800 });
ok(await qr.isVisible(), "QR continua visível no celular");
await b.close();
