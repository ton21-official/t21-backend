export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Allow CORS
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response("OK", { headers });
    }

    // Helper — read JSON
    async function readJSON(req) {
      try {
        return await req.json();
      } catch {
        return null;
      }
    }

    // ---------------------------
    // 1️⃣ GET USER DATA
    // /user?id=12345
    // ---------------------------
    if (pathname === "/user" && request.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id) return new Response("Missing id", { status: 400 });

      const data = await env.T21_KV.get(id);
      return new Response(data || "{}", { headers });
    }

    // ---------------------------
    // 2️⃣ SAVE TON ADDRESS
    // POST /save_address
    // { id: "...", address: "UQ..." }
    // ---------------------------
    if (pathname === "/save_address" && request.method === "POST") {
      const body = await readJSON(request);
      if (!body?.id || !body?.address)
        return new Response("Invalid body", { status: 400 });

      // Load existing user or create new record
      let user = await env.T21_KV.get(body.id, "json");
      if (!user) user = {};

      user.address = body.address;

      await env.T21_KV.put(body.id, JSON.stringify(user));

      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // ---------------------------
    // 3️⃣ ADD MINING REWARD
    // POST /add_mining
    // { id: "...", amount: 20 }
    // ---------------------------
    if (pathname === "/add_mining" && request.method === "POST") {
      const body = await readJSON(request);
      if (!body?.id || !body?.amount)
        return new Response("Invalid body", { status: 400 });

      let user = await env.T21_KV.get(body.id, "json");
      if (!user) user = { balance: 0 };

      user.balance = (user.balance || 0) + body.amount;
      user.lastMining = Date.now();

      await env.T21_KV.put(body.id, JSON.stringify(user));

      return new Response(JSON.stringify({ ok: true, balance: user.balance }), { headers });
    }

    // ---------------------------
    // 4️⃣ ADD AD REWARD
    // POST /add_ad_reward
    // { id: "...", amount: 5 }
    // ---------------------------
    if (pathname === "/add_ad_reward" && request.method === "POST") {
      const body = await readJSON(request);
      if (!body?.id || !body?.amount)
        return new Response("Invalid body", { status: 400 });

      let user = await env.T21_KV.get(body.id, "json");
      if (!user) user = { balance: 0, adsToday: 0 };

      // Limit: 10 ads per day
      const day = new Date().toDateString();
      if (user.lastAdDay !== day) {
        user.lastAdDay = day;
        user.adsToday = 0;
      }

      if (user.adsToday >= 10)
        return new Response(JSON.stringify({ error: "LIMIT" }), { headers });

      user.adsToday++;
      user.balance = (user.balance || 0) + body.amount;

      await env.T21_KV.put(body.id, JSON.stringify(user));

      return new Response(JSON.stringify({ ok: true, balance: user.balance, adsToday: user.adsToday }), {
        headers,
      });
    }

    // ---------------------------
    // Default
    // ---------------------------
    return new Response("T21 backend is running", { headers });
  },
};
