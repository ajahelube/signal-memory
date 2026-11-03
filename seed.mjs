import { mw, NS } from "./client.mjs";
import fs from "fs";
const M = [
"[DEMO] Claim logged 2026-10-01: @alpha_sample (fictional sample source) predicted SOL would reclaim $200 within 14 days. Asset: SOL. Status: pending.",
"[DEMO] Outcome 2026-10-15: @alpha_sample SOL $200 call was RIGHT (SOL closed at $204). Trust score for @alpha_sample raised 62 -> 70 on SOL calls.",
"[DEMO] Claim logged 2026-10-02: @degen_demo (fictional sample source) predicted BTC would drop below $90k by Oct 20. Asset: BTC. Status: pending.",
"[DEMO] Outcome 2026-10-20: @degen_demo BTC sub-$90k call was WRONG (BTC held above $105k). Trust score for @degen_demo lowered 55 -> 44.",
"[DEMO] Claim logged 2026-10-03: @suiwatch_sample (fictional sample source) said SUI DEX volume would beat its monthly high in October. Asset: SUI. Status: pending.",
"[DEMO] Outcome 2026-10-31: @suiwatch_sample SUI DEX volume call was RIGHT. Trust score for @suiwatch_sample raised 58 -> 67 on SUI ecosystem data.",
"[DEMO] Claim logged 2026-10-05: @chartwizard_demo (fictional sample source) predicted SOL would fall to $150 by Oct 25. Asset: SOL. Status: pending.",
"[DEMO] Outcome 2026-10-25: @chartwizard_demo SOL $150 call was WRONG (SOL stayed above $190). Trust score for @chartwizard_demo on SOL lowered 50 -> 38.",
"[DEMO] Claim logged 2026-10-08: @alpha_sample predicted a major Solana memecoin launchpad would cut fees before November. Asset: SOL ecosystem. Status: pending.",
"[DEMO] Outcome 2026-10-29: @alpha_sample launchpad fee-cut call was RIGHT. @alpha_sample now 2/2 on SOL calls; trust score raised 70 -> 78. Most reliable SOL source so far.",
"[DEMO] Claim logged 2026-10-10: @ethmaxi_sample (fictional sample source) predicted ETH/BTC ratio would rise above 0.04 by end of October. Asset: ETH. Outcome 2026-10-31: WRONG. Trust score lowered 60 -> 51.",
"[DEMO] Trust leaderboard snapshot 2026-11-01 (sample data): @alpha_sample 78 (SOL specialist, 2/2), @suiwatch_sample 67 (SUI, 1/1), @ethmaxi_sample 51, @degen_demo 44, @chartwizard_demo 38 (0/1 on SOL).",
];
const log = [];
for (const text of M) {
  const t0 = new Date().toISOString();
  try {
    const acc = await mw.rememberAsync(text, NS);
    const r = await mw.waitForRememberJob(acc.job_id ?? acc.jobId, { timeoutMs: 300000 });
    log.push({ text, namespace: NS, job_id: acc.job_id ?? acc.jobId, blob_id: r.blob_id ?? r.blobId, submitted_at: t0, confirmed_at: new Date().toISOString() });
    console.log("OK", r.blob_id ?? r.blobId);
  } catch (e) { log.push({ text, submitted_at: t0, error: `${e?.name}: ${e?.message}` }); console.log("ERR", e?.name, e?.message); }
  fs.writeFileSync("memories-log.json", JSON.stringify({ memories: log }, null, 2));
}
