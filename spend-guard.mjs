// Spend Guard: recall -> SERV Reasoning decision -> app enforces the cap -> Kite Passport session pays within it.
import { decideSpend, hasServ, SERV_MODEL, PROMPT_VERSION } from "./serv.mjs";
import { kitePayer, KITE_MODE, KITE_PAY_URL, KITE_FALLBACK_URL } from "./kite.mjs";

// Absolute ceiling the app will ever let SERV pick, in USDC. The 402 price for one swap.io quote is about 0.001 USDC.
export const HARD_CAP_USDC = Number(process.env.SPEND_GUARD_HARD_CAP || "0.05");
export const SWAP_QUOTE_BODY = {
  input: { token: "So11111111111111111111111111111111111111112", amount: "1000000000", chainKey: "sol" },
  output: { token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chainKey: "sol" },
  userAddress: "11111111111111111111111111111111", slippageBps: 50
};
const priceUsdc = (q) => (q && q.atomic != null ? Number(BigInt(String(q.atomic))) / 1e6 : null);

export function spendGuardConfig() {
  return { serv: hasServ(), model: SERV_MODEL, promptVersion: PROMPT_VERSION, kiteMode: KITE_MODE, hardCapUsdc: HARD_CAP_USDC, payUrl: KITE_PAY_URL };
}

// deps: { recall(q) -> {results, mode}, trust() -> [{source, score, right, wrong}], quote() -> unpaid 402 price }
export async function spendGuard(question, deps) {
  const steps = [];
  const rec = await deps.recall(question);
  const evidence = (rec.results || []).slice(0, 5).map(r => ({ text: r.text, blob_id: r.blob_id }));
  steps.push({ step: "recall", mode: rec.mode, count: evidence.length });
  const trust = deps.trust();
  let quote = null;
  try { quote = await deps.quote(); } catch { quote = { error: "Could not reach swap.io." }; }
  if (quote?.error) quote = { ...quote, atomic: null };
  steps.push({ step: "unpaid_quote", price: quote?.price || null, paid: false });

  const { decision, meta } = await decideSpend({ question, evidence, trust, quote, hardCapUsdc: HARD_CAP_USDC });
  steps.push({ step: "serv_reasoning", model: meta.model, latencyMs: meta.latencyMs });

  // Deterministic policy, enforced by the app, not the model.
  const price = priceUsdc(quote);
  const cap = Math.min(decision.max_amount_usdc, HARD_CAP_USDC);
  let blockedBy = null;
  if (!decision.pay_quote || decision.abstain) blockedBy = "serv_said_no";
  else if (price == null) blockedBy = "price_unknown";
  else if (price > cap) blockedBy = "price_above_cap";
  const approved = !blockedBy;

  let kite = null;
  if (approved) {
    const payer = kitePayer();
    const session = await payer.createSession({
      summary: `Signal Memory Spend Guard: one swap.io quote, cap ${cap} USDC`,
      maxPerTx: cap, maxTotal: cap, ttl: "30m"
    });
    kite = { mode: payer.mode, simulated: payer.simulated, session };
    if (payer.simulated) kite.payment = await payer.execute({ url: KITE_PAY_URL, method: "POST", body: SWAP_QUOTE_BODY });
    else kite.next = "Approve the session at approvalUrl with your passkey, then call POST /api/spend-guard/pay with the requestId.";
  }
  const outcome = approved ? (kite?.simulated ? "approved_dry_run" : "approved_awaiting_passkey") : `refused_${blockedBy}`;
  console.log(JSON.stringify({ tag: "spend-guard", model: meta.model, promptVersion: meta.promptVersion, latencyMs: meta.latencyMs, outcome, cap, price }));
  return { question, evidence, recallMode: rec.mode, quote, decision, meta, policy: { hardCapUsdc: HARD_CAP_USDC, cap, priceUsdc: price, approved, blockedBy }, kite, outcome, steps };
}

// Owner only, real mode only: after the passkey approval, pay once inside the session.
export async function spendGuardPay({ requestId, useFallback }) {
  const payer = kitePayer();
  if (payer.simulated) throw Object.assign(new Error("Kite is in dry run mode. Set KITE_MODE=kpass to pay."), { code: "dry_run" });
  const approval = requestId ? await payer.waitForApproval(requestId) : null;
  const url = useFallback ? KITE_FALLBACK_URL : KITE_PAY_URL;
  const payment = await payer.execute(useFallback ? { url, method: "GET" } : { url, method: "POST", body: SWAP_QUOTE_BODY });
  return { approval, payment, url, fallback: !!useFallback, label: useFallback ? "Kite catalog test service (fallback), not a swap.io payment" : "swap.io quote" };
}
