import { chromium, devices } from "playwright";
const URL = "http://127.0.0.1:8765/index.html";
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };

async function openGame(ctxOpts) {
  const ctx = await b.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.route(/\.supabase\.co\//, route => route.abort());
  page.on("dialog", d => d.dismiss());
  await page.goto(URL); await page.waitForTimeout(300);
  await page.fill("#name", "Toque");
  await page.fill("#password", "abc");
  await page.evaluate(() => document.querySelector("#form").requestSubmit());
  await page.waitForTimeout(200);
  await page.click("#start");
  await page.waitForTimeout(200);
  return { ctx, page };
}
const onScreen = (r) => r.width > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
// Counts buttons that are rendered AND inside the visible viewport.
const visibleButtons = (page) =>
  page.locator("#game .touch button").evaluateAll(
    (bs, src) => { const onScreen = eval(src); return bs.filter(x => getComputedStyle(x.parentElement).display !== "none" && onScreen(x.getBoundingClientRect())).length; },
    onScreen.toString());
const playerOnScreen = (page) =>
  page.evaluate((src) => eval(src)(document.querySelector("#player").getBoundingClientRect()), onScreen.toString());

const landscape = { ...devices["iPhone 13"], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true };
const phone = await openGame(landscape);
ok((await visibleButtons(phone.page)) === 3, "CA1 celular deitado mostra os 3 botões dentro da tela");
ok(await playerOnScreen(phone.page), "CA1 celular deitado mostra o ursinho inteiro na tela");
// High in the air so two frames later the bear has not fallen out of the level yet.
await phone.page.evaluate(() => new Promise(r => {
  S.x = 1200; S.y = 60; S.vy = 0;
  requestAnimationFrame(() => requestAnimationFrame(r));
}));
ok(await playerOnScreen(phone.page), "CA1 câmera acompanha o ursinho com o mundo reduzido");
await phone.page.evaluate(() => launch());
await phone.page.waitForTimeout(200);

const portrait = await openGame({ ...devices["iPhone 13"] });
ok((await visibleButtons(portrait.page)) === 3, "celular em pé mostra os 3 botões");
ok(await playerOnScreen(portrait.page), "celular em pé mostra o ursinho");
await portrait.ctx.close();

const tablet = await openGame({ viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true });
ok((await visibleButtons(tablet.page)) === 3, "tablet mostra os 3 botões");
await tablet.ctx.close();

const desk = await openGame({ viewport: { width: 1280, height: 800 } });
ok((await visibleButtons(desk.page)) === 0, "CA2 computador sem toque não mostra os botões");
ok(await desk.page.evaluate(() => !document.querySelector("#world").style.zoom), "computador não reduz o mundo");
await desk.ctx.close();

const p = phone.page;
const fire = (key, type) => p.evaluate(([k, t]) => {
  document.querySelector(`#game .touch button[data-key="${k}"]`)
    .dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 7, pointerType: "touch" }));
}, [key, type]);
await fire("ArrowRight", "pointerdown");
ok(await p.evaluate(() => S.keys.has("ArrowRight")), "segurar → anda para a direita");
await fire("ArrowRight", "pointercancel");
ok(!(await p.evaluate(() => S.keys.has("ArrowRight"))), "CA3 pointercancel solta o botão");
await fire("ArrowLeft", "pointerdown");
await fire("ArrowLeft", "pointerleave");
ok(!(await p.evaluate(() => S.keys.has("ArrowLeft"))), "CA3 dedo saindo do botão solta o botão");

await fire("ArrowRight", "pointerdown");
const jumps = await p.evaluate(() => { let n = 0; const orig = window.jump; window.jump = () => { n++; orig(); }; return new Promise(r => {
  document.querySelector('#game .touch button[data-key="Space"]').dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 8, pointerType: "touch" }));
  window.jump = orig; r(n);
}); });
ok(jumps === 1 && (await p.evaluate(() => S.keys.has("ArrowRight"))), "CA4 pular enquanto segura → funciona");
await fire("ArrowRight", "pointerup");
await phone.ctx.close();
await b.close();
