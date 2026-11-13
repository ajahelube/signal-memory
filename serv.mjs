// SERV Reasoning (OpenServ) client for Spend Guard.
// SERV makes the judgment call: should the agent pay for a live swap.io quote, with what cap, and why.
// The app does all exact work (recall, trust math, price lookup, cap enforcement). The model never signs or pays.
export const SERV_URL = "https://inference-api.openserv.ai/v1/chat/completions";
export const SERV_MODEL = process.env.SERV_MODEL || "serv-mini";
export const PROMPT_VERSION = "spend-guard-v2";
const key = () => (process.env.SERV_API_KEY || process.env.OPENSERV_API_KEY || "").trim();
export const hasServ = () => key().length > 10;

export const SYSTEM_PROMPT = `You are Spend Guard, the spending judge inside Signal Memory, a crypto research agent that remembers which public accounts made right or wrong calls.
The user asks a question about a creator or coin and whether the agent should pay for one live swap.io quote (paid per request in USDC through x402).
Your job: decide if paying for that quote is worth it, set a spend cap, and explain why in one or two plain sentences.

Decision policy, in priority order:
1. Never exceed the hard cap given in the request. Your max_amount_usdc must be less than or equal to it.
2. Pay only when the quote would change what the user does: there is a relevant source with a resolved track record on the asset the quote is for, and the user's question is about acting on a price.
3. If the recalled evidence is missing, unrelated to the asset, or the only relevant sources have a poor record (trust score under 50), do not pay.
4. If the question is only about past reliability ("who was right"), memory already answers it, so do not pay.
5. Choose max_amount_usdc from the allowed tiers. When you pay, pick the smallest tier that still covers the listed live price; use a higher tier only for high confidence decisions where a small price move should not block the purchase. When you do not pay, choose 0.
6. Set abstain to true only when the evidence is too thin to answer the question at all.
Use only the evidence provided. Do not invent sources, scores, or prices. Do not do price arithmetic; the app compares your cap to the live price.`;

const SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string", description: "Short answer to the user's question from the recalled evidence only." },
    pay_quote: { type: "boolean", description: "True if the agent should pay for one live swap.io quote." },
    max_amount_usdc: { type: "number", enum: [0, 0.005, 0.01, 0.02, 0.05], description: "Spend cap tier in USDC for this purchase. 0 when pay_quote is false." },
    reason: { type: "string", description: "One or two plain sentences explaining the decision." },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    abstain: { type: "boolean", description: "True only if evidence is too thin to answer at all." }
  },
  required: ["answer", "pay_quote", "max_amount_usdc", "reason", "confidence", "abstain"],
  additionalProperties: false
};

export function buildUserMessage({ question, evidence, trust, quote, hardCapUsdc }) {
  return JSON.stringify({
    question,
    hard_cap_usdc: hardCapUsdc,
    live_quote_for: "1 SOL to USDC on Solana via swap.io",
    live_quote_price: quote?.price || "unknown",
    recalled_memories: evidence.map(e => e.text),
    trust_leaderboard: trust
  }, null, 1);
}

// Returns { decision, meta } or throws an Error with .code in: no_key, timeout, http_<status>, refusal, truncated, bad_json, invalid.
export async function decideSpend(input) {
  if (!hasServ()) throw Object.assign(new Error("SERV API key is not configured."), { code: "no_key" });
  const t0 = Date.now();
  let r;
  try {
    r = await fetch(SERV_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key()}` },
      body: JSON.stringify({
        model: SERV_MODEL,
        reasoning_effort: "low",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: buildUserMessage(input) }],
        response_format: { type: "json_schema", json_schema: { name: "spend_decision", strict: true, schema: SCHEMA } }
      }),
      signal: AbortSignal.timeout(25000)
    });
  } catch (e) {
    throw Object.assign(new Error("SERV Reasoning did not answer in time."), { code: e.name === "TimeoutError" ? "timeout" : "network" });
  }
  const latencyMs = Date.now() - t0;
  const body = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = body?.error?.message || `HTTP ${r.status}`;
    throw Object.assign(new Error(`SERV Reasoning error: ${msg}`), { code: r.status === 402 ? "no_credits" : `http_${r.status}` });
  }
  const choice = body?.choices?.[0];
  if (choice?.message?.refusal) throw Object.assign(new Error("SERV Reasoning refused the request."), { code: "refusal" });
  if (choice?.finish_reason === "length") throw Object.assign(new Error("SERV Reasoning output was truncated."), { code: "truncated" });
  let d;
  try { d = JSON.parse(choice?.message?.content || ""); }
  catch { throw Object.assign(new Error("SERV Reasoning returned invalid JSON."), { code: "bad_json" }); }
  const ok = d && typeof d.answer === "string" && typeof d.pay_quote === "boolean" && typeof d.max_amount_usdc === "number"
    && Number.isFinite(d.max_amount_usdc) && d.max_amount_usdc >= 0 && typeof d.reason === "string"
    && ["low", "medium", "high"].includes(d.confidence) && typeof d.abstain === "boolean";
  if (!ok) throw Object.assign(new Error("SERV Reasoning returned fields outside the schema."), { code: "invalid" });
  return {
    decision: d,
    meta: { model: body.model || SERV_MODEL, promptVersion: PROMPT_VERSION, latencyMs, usage: body.usage || null, id: body.id || null }
  };
}
