import puppeteer from "@cloudflare/puppeteer";

const FORM = "https://www.facebook.com/marketplace/create/item";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const json = (body, status = 200) => Response.json(body, { status, headers });

const panel = `<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Piloto Marketplace BBIS</title>
<h1>Piloto Marketplace BBIS</h1>
<label>Clave del piloto <input id="token" type="password" autocomplete="off"></label>
<p><button id="start">Abrir Facebook remoto</button>
<button id="check" disabled>Verificar acceso a Marketplace</button></p>
<p><a id="live" target="_blank" rel="noopener noreferrer" hidden>Abrir Live View e iniciar sesión</a></p>
<pre id="result" aria-live="polite"></pre>
<script>
let sessionId;
const token = document.getElementById("token");
const start = document.getElementById("start");
const check = document.getElementById("check");
const live = document.getElementById("live");
const result = document.getElementById("result");
async function run(path) {
  start.disabled = check.disabled = true;
  result.textContent = "Procesando...";
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: {Authorization: "Bearer " + token.value, "Content-Type": "application/json"},
      body: JSON.stringify({ sessionId }),
    });
    const data = await response.json();
    if (data.liveUrl && data.sessionId) {
      sessionId = data.sessionId;
      live.href = data.liveUrl;
      live.hidden = false;
    }
    result.textContent = data.status;
  } catch {
    result.textContent = "No se pudo completar la solicitud.";
  } finally {
    start.disabled = false;
    check.disabled = !sessionId;
  }
}
start.onclick = () => run("/session/start");
check.onclick = () => run("/marketplace/check");
</script></html>`;

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/" && request.method === "GET") {
      return new Response(panel, { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
    }
    if (request.method !== "POST") return json({ status: "Ruta no disponible." }, 404);
    if (!env.PILOT_ACCESS_TOKEN ||
        request.headers.get("Authorization") !== `Bearer ${env.PILOT_ACCESS_TOKEN}`) {
      return json({ status: "Clave del piloto incorrecta o sin configurar." }, 401);
    }

    let browser;
    let keepOpen = false;
    try {
      if (path === "/browser-check") {
        await env.BROWSER.quickAction("screenshot", { html: "<h1>BBIS Browser Run pilot</h1>" });
        return json({ status: "Browser Run disponible.", browser_run: "ok" });
      }
      if (path === "/session/start") {
        browser = await puppeteer.launch(env.BROWSER, { keep_alive: 300_000 });
        const page = await browser.newPage();
        await page.goto("https://www.facebook.com/login/", { waitUntil: "domcontentloaded", timeout: 20_000 });
        const cdp = await page.createCDPSession();
        const { devtoolsFrontendUrl } = await cdp.send("Cloudflare.getLiveView", {
          mode: "tab", expiresInMs: 300_000,
        });
        const sessionId = browser.sessionId();
        if (!devtoolsFrontendUrl || !sessionId) throw new Error("Live View unavailable");
        keepOpen = true;
        return json({ status: "Abre Live View e inicia sesión. Después vuelve y verifica el acceso.", sessionId, liveUrl: devtoolsFrontendUrl });
      }
      if (path === "/marketplace/check") {
        const { sessionId } = await request.json().catch(() => ({}));
        if (typeof sessionId !== "string" || !/^[a-f0-9-]{36}$/i.test(sessionId)) {
          return json({ status: "Abre primero una sesión desde este panel." }, 400);
        }
        browser = await puppeteer.connect(env.BROWSER, sessionId);
        keepOpen = true;
        const page = await browser.newPage();
        try {
          const response = await page.goto(FORM, { waitUntil: "domcontentloaded", timeout: 20_000 });
          const location = new URL(page.url());
          if (/login|checkpoint|challenge|recover/.test(location.pathname)) {
            return json({ status: "Facebook requiere inicio de sesión o verificación." }, 409);
          }
          if (!response?.ok() || location.hostname !== "www.facebook.com" ||
              !location.pathname.startsWith("/marketplace/create/item")) {
            return json({ status: "Facebook no abrió el formulario de Marketplace." }, 409);
          }
          const input = await page.waitForSelector('input[type="file"][accept*="image"]', { timeout: 8_000 }).catch(() => null);
          return input
            ? json({ status: "Formulario de Marketplace detectado. Esta prueba no publica." })
            : json({ status: "La página abrió, pero el formulario no se pudo confirmar." }, 409);
        } finally {
          await page.close().catch(() => {});
        }
      }
      return json({ status: "Ruta no disponible." }, 404);
    } catch {
      return json({ status: "Browser Run no completó la solicitud. Revisa la sesión y la cuota de tu cuenta." }, 502);
    } finally {
      if (browser) {
        try {
          if (keepOpen) await browser.disconnect();
          else await browser.close();
        } catch {}
      }
    }
  },
};
