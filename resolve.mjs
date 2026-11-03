// Auto resolve open price claims with live Tatum prices, then write outcome + new trust score to Walrus Memory.
// Usage: node resolve.mjs [--force]   (--force resolves claims before their deadline, for demos)
import { getPrice } from "./tatum.mjs";
import { load, save, score } from "./trust.mjs";
import { mw, NS, rememberWait } from "./client.mjs";
import fs from "fs";
export async function resolveAll({ force = false, write = true } = {}) {
  const d = load(); const out = [];
  for (const c of d.claims.filter(c => !c.outcome && c.target)) {
    if (!force && Date.now() < Date.parse(c.deadline)) continue;
    const p = await getPrice(c.asset);
    const before = score(d.claims, c.source).score;
    const hit = c.direction === "above" ? p.usd >= c.target : p.usd <= c.target;
    Object.assign(c, { outcome: hit ? "RIGHT" : "WRONG", resolvedAt: new Date().toISOString(), price: p.usd, priceSource: p.source });
    const after = score(d.claims, c.source).score;
    const text = `Outcome ${c.resolvedAt.slice(0,10)}: ${c.source} ${c.asset} ${c.direction} $${c.target} call was ${c.outcome} (${c.asset} at $${p.usd} via ${p.source}). Trust score for ${c.source} ${before} -> ${after}.`;
    let receipt = null;
    if (write) { receipt = await rememberWait(text); c.blob_id = receipt;
      const log = JSON.parse(fs.readFileSync("memories-log.json")); log.memories.push({ text, namespace: NS, blob_id: receipt, confirmed_at: new Date().toISOString() });
      fs.writeFileSync("memories-log.json", JSON.stringify(log, null, 2)); }
    out.push({ ...c, text, before, after });
  }
  save(d); return out;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(await resolveAll({ force: process.argv.includes("--force") }), null, 2));
