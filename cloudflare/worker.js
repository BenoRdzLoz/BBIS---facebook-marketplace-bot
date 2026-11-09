export default {
  async fetch(request, env) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/browser-check") {
      return new Response("Not found", { status: 404 });
    }

    if (!env.PILOT_ACCESS_TOKEN ||
        request.headers.get("Authorization") !== `Bearer ${env.PILOT_ACCESS_TOKEN}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      await env.BROWSER.quickAction("screenshot", {
        html: "<html><body><h1>BBIS Browser Run pilot</h1></body></html>",
      });
      return Response.json({ browser_run: "ok" });
    } catch {
      return Response.json({ browser_run: "failed" }, { status: 502 });
    }
  },
};
