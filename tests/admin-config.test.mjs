// Acceptance tests for docs/specs/admin-config.md. Run: npm run serve & npm test
import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8765/index.html";
const SB = "https://fake.supabase.co";
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };

async function open({ configured = true, difficulty = "normal", authOk = true, rankingRows = [], heartRows = [] } = {}) {
  const page = await (await b.newContext()).newPage();
  const calls = [];
  page.errs = [];
  page.on("pageerror", e => page.errs.push(String(e)));
  page.on("dialog", d => d.dismiss());
  // Never touch the real project: the page's config is always swapped for a fake or empty one.
  await page.route(/\.supabase\.co\//, route => route.abort());
  await page.route(BASE, async route => {
    const res = await route.fetch();
    const cfg = configured ? `{ url: "${SB}", key: "pk_test" }` : `{ url: "", key: "" }`;
    const body = (await res.text())
      .replace(/const SUPABASE = \{[^}]*\};/, `const SUPABASE = ${cfg};`)
      .replace(/const ADMIN_EMAIL = "[^"]*";/, 'const ADMIN_EMAIL = "rebeca@example.com";');
    await route.fulfill({ response: res, body });
  });
  await page.route(SB + "/**", route => {
    const req = route.request();
    const url = req.url();
    calls.push({ method: req.method(), url, body: req.postData(), auth: req.headers()["authorization"] });
    const json = (status, data) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (url.includes("/auth/v1/token"))
      return authOk ? json(200, { access_token: "tok123", expires_in: 3600 }) : json(400, { error: "invalid_grant" });
    if (url.includes("/rest/v1/settings") && req.method() === "GET") return json(200, [{ difficulty }]);
    if (url.includes("/rest/v1/ranking_best")) return json(200, rankingRows);
    if (url.includes("/rest/v1/player_hearts")) return json(200, heartRows);
    if (req.method() === "PATCH" || req.method() === "POST") return route.fulfill({ status: 204, body: "" });
    return json(200, []);
  });
  await page.goto(BASE);
  await page.waitForTimeout(500);
  return { page, calls };
}
async function login(page, name, pwd = "x") {
  await page.evaluate(() => screen("account"));
  await page.fill("#name", name); await page.fill("#password", pwd);
  await page.evaluate(() => document.querySelector("#form").requestSubmit());
  await page.waitForTimeout(400);
}
const jumpVy = page => page.evaluate(() => { S.ground = true; S.pause = false; jump(); return S.vy; });
const platAmp = page => page.evaluate(() => Math.abs(platOffset({ range: 40, period: 6 }, 1500)));

// CA1
{
  const { page } = await open({ configured: false });
  await login(page, "Joao");
  ok((await page.locator("#phaseSelect").count()) === 0, "CA1 lobby sem seletor de fases");
  ok((await page.locator("#start").innerText()).includes("Começar aventura"), "CA1 botão 'Começar aventura'");
  await page.evaluate(() => { S.level = 2; S.baseTime = 99999; S.totalHearts = 9; });
  await page.click("#start");
  ok(await page.evaluate(() => S.level === 0 && S.baseTime === 0 && S.totalHearts === 0), "CA1 Começar aventura sempre inicia na fase 1 zerado");
  ok(page.errs.length === 0, "CA1 sem erros JS " + page.errs);
}
// CA2
{
  const normal = await open({ difficulty: "normal" });
  const facil = await open({ difficulty: "facil" });
  const dificil = await open({ difficulty: "dificil" });
  const [vn, vf, vd] = [await jumpVy(normal.page), await jumpVy(facil.page), await jumpVy(dificil.page)];
  ok(vf < vn && vn < vd, `CA2 pulo: fácil ${vf} mais forte que normal ${vn}, difícil ${vd} mais fraco`);
  const [an, af, ad] = [await platAmp(normal.page), await platAmp(facil.page), await platAmp(dificil.page)];
  ok(af < an && an < ad, `CA2 plataformas móveis: fácil ${af.toFixed(1)} < normal ${an.toFixed(1)} < difícil ${ad.toFixed(1)}`);
}
// CA3 + CA4 + CA6 (admin side)
{
  const { page, calls } = await open({ heartRows: [{ name: "Maria", hearts: 12, phases: 3 }, { name: "<b>x</b>", hearts: 1, phases: 1 }] });
  await login(page, "Rebeca", "rebeca123");
  const auth = calls.find(c => c.url.includes("/auth/v1/token"));
  ok(!!auth && JSON.parse(auth.body).email === "rebeca@example.com", "CA3 login da Rebeca chama /auth/v1/token com ADMIN_EMAIL");
  ok(await page.locator("#openadmin").isVisible(), "CA3 senha certa mostra admin");
  await page.click("#openadmin"); await page.waitForTimeout(300);
  await page.click("#tab-players"); await page.waitForTimeout(300);
  const players = await page.locator("#adminplayers").innerText();
  ok(players.includes("Maria") && players.includes("12") && players.includes("<b>x</b>"), "CA6 aba Jogadores lista player_hearts (escapado): " + JSON.stringify(players));
  await page.click("#tab-difficulty");
  await page.click('.diff-btn[data-d="dificil"]'); await page.waitForTimeout(300);
  const patch = calls.find(c => c.method === "PATCH" && c.url.includes("/rest/v1/settings"));
  ok(!!patch && patch.auth === "Bearer tok123" && JSON.parse(patch.body).difficulty === "dificil", "CA4 salvar faz PATCH em settings com Bearer token");
  ok((await page.evaluate("S.difficulty")) === "dificil", "CA4 dificuldade aplicada na hora");
  ok(page.errs.length === 0, "CA3/4/6 sem erros JS " + page.errs);
}
{
  const { page } = await open({ authOk: false });
  await login(page, "Rebeca", "errada");
  ok(!(await page.locator("#openadmin").isVisible()), "CA3 senha errada não mostra admin");
  ok(!(await page.content()).includes("rebeca123"), "RF2 senha da Rebeca não está no código com Supabase ligado");
}
// CA5 + CA6 (player side)
{
  const { page, calls } = await open({ difficulty: "facil" });
  await login(page, "Joao");
  ok(calls.some(c => c.url.includes("/rest/v1/ranking_best") && c.url.includes("difficulty=eq.facil")), "CA5 ranking filtra pela dificuldade");
  await page.click("#start");
  for (let i = 0; i < 3; i++) await page.evaluate(() => { if (S.level) launch(); S.levelHearts = 2; S.levelElapsed = 20000; finish(); });
  await page.waitForTimeout(400);
  const phasePosts = calls.filter(c => c.method === "POST" && c.url.includes("/rest/v1/phase_results"));
  const phaseRows = phasePosts.flatMap(c => [].concat(JSON.parse(c.body)));
  ok(phaseRows.length === 3 && phaseRows.every(r => r.name === "Joao" && r.hearts === 2), "CA6 cada fase concluída gera POST em phase_results " + JSON.stringify(phaseRows));
  const rk = calls.filter(c => c.method === "POST" && c.url.includes("/rest/v1/ranking?") || c.url.endsWith("/rest/v1/ranking")).flatMap(c => [].concat(JSON.parse(c.body || "[]")));
  ok(rk.length === 1 && rk[0].difficulty === "facil", "CA5 resultado vai com a dificuldade " + JSON.stringify(rk));
}
// CA7
{
  const { page } = await open({ configured: false });
  await login(page, "Ana");
  await page.click("#start");
  await page.evaluate(() => { S.levelHearts = 4; S.levelElapsed = 20000; finish(); });
  await login(page, "Rebeca", "rebeca123");
  await page.click("#openadmin"); await page.waitForTimeout(200);
  await page.click("#tab-players"); await page.waitForTimeout(200);
  const players = await page.locator("#adminplayers").innerText();
  ok(players.includes("Ana") && players.includes("4"), "CA7 modo local lista jogadores com corações: " + JSON.stringify(players));
  await page.click("#tab-difficulty");
  await page.click('.diff-btn[data-d="facil"]');
  await page.reload(); await page.waitForTimeout(300);
  ok((await page.evaluate("S.difficulty")) === "facil", "CA7 modo local guarda a dificuldade no navegador");
}
await b.close();
