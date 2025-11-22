export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/ping") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (pathname === "/getUser") {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const user = await env.T21_USERS.get(ip, "json") || { balance: 0 };
      return new Response(JSON.stringify(user), { headers: { "Content-Type": "application/json" } });
    }

    if (pathname === "/updateBalance") {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const data = await request.json();
      
      await env.T21_USERS.put(ip, JSON.stringify(data), {
        expirationTtl: 60 * 60 * 24 * 90 // 90 дней
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
}
