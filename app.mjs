// Request handler shared by local server (server.mjs) and Vercel (api/index.mjs).
import fs from "fs";
import { load, save, leaderboard } from "./trust.mjs";
import { getPrice, hasTatum } from "./tatum.mjs";
import { resolveAll } from "./resolve.mjs";
import { mw, NS, rememberWait, hasMemWal } from "./client.mjs";
import { spendGuard, spendGuardPay, spendGuardConfig } from "./spend-guard.mjs";
const LOG = new URL("./memories-log.json", import.meta.url);
const INDEX = new URL("./public/index.html", import.meta.url);
// Public deployments (Vercel, or READ_ONLY=1) never write or resolve memories; only the owner's local run does.
export const READ_ONLY = !!process.env.VERCEL || process.env.READ_ONLY === "1";
// Best effort in memory rate limit per visitor IP (per warm instance).
const hits = new Map();
const INSTANCE = Math.random().toString(36).slice(2, 8);
function limited(req, bucket, max, windowMs) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const k = bucket + ":" + ip, now = Date.now();
  const arr = (hits.get(k) || []).filter(t => now - t < windowMs); arr.push(now); hits.set(k, arr);
  if (hits.size > 5000) for (const [kk, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(kk);
  req._rl = `${INSTANCE}:${arr.length}/${max}`;
  return arr.length > max;
}
// Cache prices for 60s so page loads do not each call Tatum.
let priceCache = { at: 0, data: null };
async function prices() {
  if (priceCache.data && Date.now() - priceCache.at < 60000) return priceCache.data;
  const data = await Promise.all(["SOL","BTC","ETH","SUI"].map(getPrice));
  priceCache = { at: Date.now(), data }; return data;
}
// Fallback when live recall is unavailable: simple keyword match over the logged Walrus memories.
function logSearch(q) {
  const STOP = new Set(["who","what","which","the","is","are","was","were","most","on","of","for","and","calls","call","about","record","did","does","has","have","how","any","any"]);
  const words = (q.toLowerCase().match(/[a-z0-9@_$]+/g) || []).map(w => w.replace(/'s$/, "")).filter(w => !STOP.has(w));
  if (/reliab|trust|best|right/.test(q.toLowerCase())) words.push("right");
  const mems = JSON.parse(fs.readFileSync(LOG)).memories;
  return mems.map(m => ({ blob_id: m.blob_id, text: m.text, hits: words.filter(w => w.length > 1 && m.text.toLowerCase().includes(w)).length }))
    .filter(m => m.hits).sort((a, b) => b.hits - a.hits).slice(0, 5)
    .map(({ blob_id, text, hits }) => ({ blob_id, text, distance: 1 - Math.min(1, hits / Math.max(1, words.length)) }));
}

// Unpaid swap.io x402 quote price. This never pays; it only reads the HTTP 402.
const QUOTE_URL = "https://hermes.swap.io/v1/swap/quote";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEMO_PAYER = "11111111111111111111111111111111";
function formatUsdc(atomic) {
  const n = BigInt(String(atomic || "0"));
  const padded = n.toString().padStart(7, "0");
  const whole = padded.slice(0, -6);
  const frac = padded.slice(-6).replace(/0+$/, "") || "0";
  return `${whole}.${frac} USDC`;
}
async function unpaidQuote() {
  const r = await fetch(QUOTE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: { token: SOL_MINT, amount: "1000000000", chainKey: "sol" },
      output: { token: USDC_MINT, chainKey: "sol" },
      userAddress: DEMO_PAYER,
      slippageBps: 50
    }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await r.json().catch(() => null);
  if (r.status !== 402 || !body) {
    return { error: "swap.io did not return an unpaid quote price. Please try again.", status: r.status };
  }
  const list = Array.isArray(body.accepts) ? body.accepts : [];
  const picked = list.find(x => x && (x.network === "solana" || String(x.network).startsWith("solana:")) && x.asset === USDC_MINT) || list[0];
  if (!picked) return { error: "swap.io returned a 402 with no usable payment option." };
  const atomic = String(picked.maxAmountRequired ?? picked.amount ?? "0");
  return {
    paid: false,
    status: 402,
    network: picked.network || "solana",
    asset: "USDC",
    atomic,
    price: formatUsdc(atomic),
    note: "No payment was made. This is only the unpaid price for one quote request."
  };
}
const json = (res, code, o) => { res.writeHead(code, { "content-type": "application/json", ...(res.req?._rl ? { "x-rate-count": res.req._rl } : {}) }); res.end(JSON.stringify(o)); };
const body = (req) => new Promise(r => { let s = ""; req.on("data", c => s += c); req.on("end", () => r(s ? JSON.parse(s) : {})); });
const tooMany = (res) => json(res, 429, { error: "Rate limit reached. Please try again in a little while." });
export default async function handler(req, res) {
  const u = new URL(req.url, "http://x");
  try {
    if (u.pathname === "/" || u.pathname === "/index.html") { res.writeHead(200, { "content-type": "text/html" }); return res.end(fs.readFileSync(INDEX)); }
    if (u.pathname === "/api/config") return json(res, 200, { readOnly: READ_ONLY, liveRecall: hasMemWal(), tatum: hasTatum() });
    if (u.pathname === "/api/leaderboard") return json(res, 200, { leaderboard: leaderboard(load().claims), claims: load().claims, tatum: hasTatum() });
    if (u.pathname === "/api/prices") { if (limited(req, "prices", 60, 3600000)) return tooMany(res); return json(res, 200, await prices()); }
    if (u.pathname === "/api/proof") return json(res, 200, JSON.parse(fs.readFileSync(LOG)).memories.map(m => ({ blob_id: m.blob_id, text: m.text })));
    if ((u.pathname === "/api/claim" || u.pathname === "/api/resolve") && READ_ONLY)
      return json(res, 403, { error: "This public demo is read only. Logging and resolving claims writes to Walrus mainnet, so it is limited to the owner. Try a sample question below." });
    if (u.pathname === "/api/claim" && req.method === "POST") {
      const b = await body(req); const d = load();
      const c = { id: d.claims.length + 1, source: b.source, asset: b.asset, direction: b.direction, target: Number(b.target), loggedAt: new Date().toISOString(), deadline: b.deadline };
      d.claims.push(c); save(d);
      const text = `Claim logged ${c.loggedAt.slice(0,10)}: ${c.source} predicted ${c.asset} ${c.direction} $${c.target} by ${c.deadline}. Status: pending.`;
      c.blob_id = await rememberWait(text); save(d);
      const log = JSON.parse(fs.readFileSync(LOG)); log.memories.push({ text, namespace: NS, blob_id: c.blob_id, confirmed_at: new Date().toISOString() }); fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
      return json(res, 200, { claim: c, text });
    }
    if (u.pathname === "/api/resolve" && req.method === "POST") return json(res, 200, await resolveAll({ force: true }));
    if (u.pathname === "/api/ask") {
      if (limited(req, "ask", 10, 3600000)) return tooMany(res);
      const q = String(u.searchParams.get("q") || "").slice(0, 300).trim();
      if (!q) return json(res, 400, { error: "Type a question first." });
      if (hasMemWal()) {
        try { const r = await mw.recall({ query: q, limit: 5, namespace: NS }); return json(res, 200, { ...r, liveRecall: true, mode: "live Walrus Memory recall" }); }
        catch (e) { console.error("recall failed, using memory log", e.message); }
      }
      return json(res, 200, { results: logSearch(q), liveRecall: false, mode: "memory log fallback (each item is a Walrus blob, see blob_id)" });
    }
    // Unpaid x402 price check only. Never attaches a payment header or wallet key.
    if (u.pathname === "/api/quote") {
      if (limited(req, "quote", 10, 3600000)) return tooMany(res);
      try { return json(res, 200, await unpaidQuote()); }
      catch { return json(res, 200, { error: "Could not reach swap.io. Please try again." }); }
    }
    // Spend Guard (SERV Hackathon 02, Kite track): SERV Reasoning decides whether to pay for a live quote and the cap.
    if (u.pathname === "/api/spend-guard/config") return json(res, 200, spendGuardConfig());
    if (u.pathname === "/api/spend-guard" && req.method === "POST") {
      if (limited(req, "guard", 6, 3600000) || limited({ headers: { "x-forwarded-for": "all" } }, "guard-all", 200, 86400000)) return tooMany(res);
      const b = await body(req).catch(() => ({}));
      const q = String(b.q || "").slice(0, 300).trim();
      if (!q) return json(res, 400, { error: "Type a question first." });
      const recall = async (qq) => {
        if (hasMemWal()) { try { return { ...(await mw.recall({ query: qq, limit: 5, namespace: NS })), mode: "live Walrus Memory recall" }; } catch (e) { console.error("recall failed", e.message); } }
        return { results: logSearch(qq), mode: "memory log fallback" };
      };
      try { return json(res, 200, await spendGuard(q, { recall, trust: () => leaderboard(load().claims), quote: unpaidQuote })); }
      catch (e) { if (!e.code) throw e; return json(res, 200, { error: e.message, code: e.code }); }
    }
    if (u.pathname === "/api/spend-guard/pay" && req.method === "POST") {
      if (READ_ONLY) return json(res, 403, { error: "Real Kite payments run only on the owner's machine with KITE_MODE=kpass." });
      const b = await body(req).catch(() => ({}));
      try { return json(res, 200, await spendGuardPay({ requestId: b.requestId, useFallback: !!b.fallback })); }
      catch (e) { return json(res, 200, { error: e.message, code: e.code || "kite_error" }); }
    }
    json(res, 404, { error: "not found" });
  } catch (e) { console.error(e); json(res, 500, { error: READ_ONLY ? "Something went wrong, please try again." : e.message }); }
}
