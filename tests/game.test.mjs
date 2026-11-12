import { chromium } from "playwright";
const URL = "http://127.0.0.1:8765/index.html";
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
async function login(page, name, pwd) {
  await page.fill("#name", name);
  await page.fill("#password", pwd);
  await page.evaluate(() => document.querySelector("#form").requestSubmit());
  await page.waitForTimeout(200);
}
// Simulate finishing the current phase without playing it.
const finishPhase = (page) => page.evaluate(() => { S.levelElapsed = 10000; finish(); });
const ranked = (page, name) => page.evaluate(n => accounts().some(a => a.name === n && localBest(a)), name);

const ctx = await b.newContext();
const page = await ctx.newPage();
// Run the game in local-only mode; never touch the real Supabase project.
await page.route(/\.supabase\.co\//, route => route.abort());
await page.route(URL, async route => {
  const res = await route.fetch();
  const body = (await res.text()).replace(/const SUPABASE = \{[^}]*\};/, 'const SUPABASE = { url: "", key: "" };');
  await route.fulfill({ response: res, body });
});
const errs = [];
page.on("pageerror", e => errs.push(String(e)));
page.on("dialog", d => d.dismiss());
await page.goto(URL); await page.waitForTimeout(500);

ok((await page.evaluate("LEVELS.length")) === 3, "jogo tem 3 fases");
await login(page, "Joao", "abc");
ok(!(await page.locator("#openadmin").isVisible()), "jogador comum não vê admin");

// Ranking: only after all 3 phases from phase 1
await page.click("#start");
await finishPhase(page);
ok(!(await ranked(page, "Joao")), "após fase 1 ainda não está no ranking");
await page.evaluate(() => launch()); await finishPhase(page);
ok(!(await ranked(page, "Joao")), "após fase 2 ainda não está no ranking");
await page.evaluate(() => launch()); await finishPhase(page);
ok(await ranked(page, "Joao"), "após as 3 fases entra no ranking");
ok((await page.evaluate("S.level")) === 0, "estado volta para a fase 1 depois de zerar");

await page.evaluate(() => { localStorage.clear(); });
await page.reload(); await page.waitForTimeout(300);

// Admin
await page.evaluate(() => { S.run = false; screen("account"); });
await login(page, "Rebeca", "errada");
ok(!(await page.locator("#openadmin").isVisible()), "Rebeca com senha errada não vê admin");
await page.evaluate(() => localStorage.setItem("ursinho_pw", JSON.stringify({ rebeca: "outra" })));
await page.evaluate(() => screen("account"));
await login(page, "Rebeca", "rebeca123");
ok(await page.locator("#openadmin").isVisible(), "Rebeca + rebeca123 vê admin (mesmo com senha antiga salva)");
await page.click("#openadmin");
ok(await page.locator("#admin").evaluate(n => n.classList.contains("active")), "painel admin abre sem PIN");
await page.reload(); await page.waitForTimeout(300);
ok(await page.locator("#openadmin").isVisible(), "admin continua após recarregar a página");

const p2 = await (await b.newContext()).newPage();
await p2.goto(URL);
await p2.evaluate(() => { localStorage.setItem("ursinho", JSON.stringify([{ name: "Rebeca", bear: "menina" }])); localStorage.setItem("ursinho_session", "Rebeca"); });
await p2.reload(); await p2.waitForTimeout(300);
ok(!(await p2.locator("#openadmin").isVisible()), "aba nova sem login não herda admin");

ok(errs.length === 0, "sem erros de JS " + JSON.stringify(errs));
await b.close();
