import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8765/index.html";
const SB = "https://fake.supabase.co";
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };

// Opens the game with Supabase configured (by rewriting the config line) and a fake API.
async function open({ configured = true, rows = [], failPost = false } = {}) {
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  const calls = { posts: [], gets: [], other: [] };
  page.errs = [];
  page.on("pageerror", e => page.errs.push(String(e)));
  page.on("dialog", d => d.dismiss());
  await page.route(/\.supabase\.co\//, route => route.abort());
  await page.route(BASE, async route => {
    const res = await route.fetch();
    const cfg = configured ? `{ url: "${SB}", key: "pk_test" }` : `{ url: "", key: "" }`;
    const body = (await res.text())
      .replace(/const SUPABASE = \{[^}]*\};/, `const SUPABASE = ${cfg};`)
      .replace(/const ADMIN_EMAIL = "[^"]*";/, 'const ADMIN_EMAIL = "rebeca@example.com";');
    page.configLinePresent = true;
    await route.fulfill({ response: res, body });
  });
  await page.route(SB + "/**", async route => {
    const req = route.request();
    if (req.url().includes("/auth/v1/token"))
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "tok" }) });
    if (req.method() === "POST") {
      calls.posts.push({ url: req.url(), body: req.postDataJSON(), key: req.headers()["apikey"] });
      return failPost ? route.abort() : route.fulfill({ status: 201, body: "" });
    }
    calls.gets.push(req.url());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows) });
  });
  page.on("request", r => { if (!r.url().startsWith("http://127.0.0.1") && !r.url().startsWith(SB) && !r.url().includes("fonts.")) calls.other.push(r.url()); });
  await page.goto(BASE);
  await page.waitForTimeout(500);
  return { page, calls, ctx };
}
async function login(page, name, pwd = "x") {
  await page.evaluate(() => screen("account"));
  await page.fill("#name", name); await page.fill("#password", pwd);
  await page.evaluate(() => document.querySelector("#form").requestSubmit());
  await page.waitForTimeout(300);
}
async function playAll(page) {
  await page.evaluate(() => { resetRun(); launch(); });
  for (let i = 0; i < 3; i++) await page.evaluate(() => { if (S.level) launch(); S.levelElapsed = 20000; finish(); });
  await page.waitForTimeout(400);
}

// CA1
{
  const { page, calls } = await open();
  ok(page.configLinePresent, "linha de config SUPABASE existe no index.html");
  await login(page, "Joao");
  await playAll(page);
  const p = calls.posts.find(x => /\/rest\/v1\/ranking$/.test(x.url));
  const row = p && [].concat(p.body)[0];
  ok(!!row && row.name === "Joao" && row.time_ms === 60000 && p.key === "pk_test", "CA1 terminar 3 fases faz POST em /rest/v1/ranking " + JSON.stringify(calls.posts));
  ok(page.errs.length === 0, "CA1 sem erros JS " + page.errs);
}
// CA2 + CA5 + CA6
{
  const rows = [
    { name: "Maria", bear: "menina", time_ms: 45000, hearts: 7 },
    { name: '<img src=x onerror="window.pwned=1">', bear: "menino", time_ms: 50000, hearts: 3 },
  ];
  const { page, calls } = await open({ rows });
  await login(page, "Joao");
  await page.waitForTimeout(300);
  ok(calls.gets.some(u => u.includes("/rest/v1/ranking_best")), "CA2 lobby consulta ranking_best");
  const txt = await page.locator("#rank").innerText();
  ok(txt.includes("Maria") && txt.includes("00:45"), "CA2 lobby mostra jogador remoto: " + JSON.stringify(txt));
  ok(!(await page.evaluate("window.pwned")) && txt.includes("<img"), "CA5 nome com HTML aparece como texto");
  await login(page, "Rebeca", "rebeca123");
  await page.click("#openadmin");
  await page.waitForTimeout(400);
  const adm = await page.locator("#adminrank").innerText();
  ok(adm.includes("Maria") && adm.includes("Luna"), "CA6 painel admin lista remotos: " + JSON.stringify(adm));
  ok(!(await page.evaluate("window.pwned")), "CA5 painel admin também escapa");
}
// CA3
{
  const { page, calls, ctx } = await open({ failPost: true });
  await login(page, "Bia");
  await playAll(page);
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem("ursinho_pending") || "[]").filter(x => x.table === "ranking").map(x => x.row));
  ok(pending.length === 1 && pending[0].name === "Bia", "CA3 falha no POST vai para a fila local");
  await ctx.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await page.unroute(SB + "/**");
  const posts = [];
  await page.route(SB + "/**", r => { if (r.request().method() === "POST") { posts.push(r.request().postDataJSON()); return r.fulfill({ status: 201, body: "" }); } return r.fulfill({ status: 200, contentType: "application/json", body: "[]" }); });
  await page.reload(); await page.waitForTimeout(800);
  const left = await page.evaluate(() => JSON.parse(localStorage.getItem("ursinho_pending") || "[]"));
  ok(posts.some(p => (Array.isArray(p) ? p : [p]).some(x => x.name === "Bia")) && left.length === 0, "CA3 fila é reenviada no próximo carregamento");
}
// CA4
{
  const { page, calls } = await open({ configured: false });
  await login(page, "Leo");
  await playAll(page);
  const txt = await page.locator("#rank").innerText();
  ok(calls.posts.length === 0 && calls.gets.length === 0, "CA4 sem config não faz requisição");
  ok(txt.includes("Leo"), "CA4 ranking local funciona sem Supabase");
  ok(page.errs.length === 0, "CA4 sem erros JS " + page.errs);
}
await b.close();
