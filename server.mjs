// Tiny local server: node server.mjs  ->  http://localhost:3000
import http from "http"; import fs from "fs";
import { load, save, leaderboard } from "./trust.mjs";
import { getPrice, hasTatum } from "./tatum.mjs";
import { resolveAll } from "./resolve.mjs";
import { mw, NS, rememberWait } from "./client.mjs";
const json = (res, code, o) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
const body = (req) => new Promise(r => { let s = ""; req.on("data", c => s += c); req.on("end", () => r(s ? JSON.parse(s) : {})); });
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html" }); return res.end(fs.readFileSync("public/index.html")); }
    if (u.pathname === "/api/leaderboard") return json(res, 200, { leaderboard: leaderboard(load().claims), claims: load().claims, tatum: hasTatum() });
    if (u.pathname === "/api/prices") return json(res, 200, await Promise.all(["SOL","BTC","ETH","SUI"].map(getPrice)));
    if (u.pathname === "/api/proof") return json(res, 200, JSON.parse(fs.readFileSync("memories-log.json")).memories.map(m => ({ blob_id: m.blob_id, text: m.text })));
    if (u.pathname === "/api/claim" && req.method === "POST") {
      const b = await body(req); const d = load();
      const c = { id: d.claims.length + 1, source: b.source, asset: b.asset, direction: b.direction, target: Number(b.target), loggedAt: new Date().toISOString(), deadline: b.deadline };
      d.claims.push(c); save(d);
      const text = `Claim logged ${c.loggedAt.slice(0,10)}: ${c.source} predicted ${c.asset} ${c.direction} $${c.target} by ${c.deadline}. Status: pending.`;
      c.blob_id = await rememberWait(text); save(d);
      const log = JSON.parse(fs.readFileSync("memories-log.json")); log.memories.push({ text, namespace: NS, blob_id: c.blob_id, confirmed_at: new Date().toISOString() }); fs.writeFileSync("memories-log.json", JSON.stringify(log, null, 2));
      return json(res, 200, { claim: c, text });
    }
    if (u.pathname === "/api/resolve" && req.method === "POST") return json(res, 200, await resolveAll({ force: true }));
    if (u.pathname === "/api/ask") {
      const q = u.searchParams.get("q"); const r = await mw.recall({ query: q, limit: 5, namespace: NS });
      return json(res, 200, r);
    }
    json(res, 404, { error: "not found" });
  } catch (e) { json(res, 500, { error: e.message }); }
}).listen(process.env.PORT || 3000, () => console.log("Signal Memory on http://localhost:" + (process.env.PORT || 3000)));
