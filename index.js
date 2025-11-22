export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ------------------------------
    // Helpers
    // ------------------------------

    // simple json response
    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    }

    // fetch or create user
    async function getUser(tg_id) {
      let data = await env.T21_KV.get(tg_id);
      if (!data) {
        const user = {
          balance: 0,
          lastMining: 0,
          lastAd: 0,
          adsToday: 0,
          created: Date.now()
        };
        await env.T21_KV.put(tg_id, JSON.stringify(user));
        return user;
      }
      return JSON.parse(data);
    }

    async function saveUser(tg_id, data) {
      await env.T21_KV.put(tg_id, JSON.stringify(data));
    }

    // ------------------------------
    // Routes
    // ------------------------------

    // GET /get-user?tg_id=12345
    if (path === "/get-user") {
      const tg_id = url.searchParams.get("tg_id");
      if (!tg_id) return json({ error: "missing tg_id" }, 400);

      const user = await getUser(tg_id);
      return json({ ok: true, user });
    }

    // POST /daily
    if (path === "/daily") {
      const body = await request.json();
      const { tg_id } = body;
      if (!tg_id) return json({ error: "missing tg_id" }, 400);

      const user = await getUser(tg_id);
      const now = Date.now();

      // 24 hours = 86400000ms
      if (now - user.lastMining < 86400000) {
        return json({ ok: false, msg: "try later", next: user.lastMining + 86400000 });
      }

      user.balance += 20;     // +20 T21
      user.lastMining = now;

      await saveUser(tg_id, user);
      return json({ ok: true, balance: user.balance });
    }

    // POST /ad-reward
    if (path === "/ad-reward") {
      const body = await request.json();
      const { tg_id } = body;
      if (!tg_id) return json({ error: "missing tg_id" }, 400);

      const user = await getUser(tg_id);
      const now = Date.now();

      // max 10 ads per day
      const dayStart = Math.floor(now / 86400000);

      if (!user.adDay || user.adDay !== dayStart) {
        user.adDay = dayStart;
        user.adsToday = 0;
      }

      if (user.adsToday >= 10) {
        return json({ ok: false, msg: "limit reached" });
      }

      user.adsToday += 1;
      user.balance += 5;  // +5 T21 reward

      await saveUser(tg_id, user);
      return json({ ok: true, balance: user.balance, adsToday: user.adsToday });
    }

    // default
    return json({ ok: false, error: "unknown endpoint" }, 404);
  }
};
