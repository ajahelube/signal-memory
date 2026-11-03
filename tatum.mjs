// Tatum integration: live prices (Tatum Data API) and Sui onchain data (Tatum Sui RPC gateway).
// Needs a free Tatum API key in env TATUM_API_KEY (get it at https://dashboard.tatum.io).
const KEY = process.env.TATUM_API_KEY;
const H = () => ({ "x-api-key": KEY, "content-type": "application/json" });
export const hasTatum = () => !!KEY;

export async function getPrice(symbol) {
  if (KEY) {
    const r = await fetch(`https://api.tatum.io/v4/data/rate/symbol?symbol=${symbol}&basePair=USD`, { headers: H() });
    const j = await r.json();
    if (r.ok && j.value) return { symbol, usd: Number(j.value), source: "tatum", at: new Date().toISOString() };
    throw new Error(`Tatum rate error: ${j.message || r.status}`);
  }
  // Fallback ONLY when no key is set, clearly labeled so it is never mistaken for Tatum data.
  const ids = { SOL: "solana", BTC: "bitcoin", ETH: "ethereum", SUI: "sui" };
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids[symbol]}&vs_currencies=usd`);
  const j = await r.json();
  return { symbol, usd: j[ids[symbol]].usd, source: "coingecko-fallback (set TATUM_API_KEY)", at: new Date().toISOString() };
}

// Sui mainnet onchain data through Tatum's RPC gateway (proves the memory account object exists onchain).
export async function suiRpc(method, params = []) {
  if (!KEY) throw new Error("TATUM_API_KEY not set");
  const r = await fetch("https://sui-mainnet.gateway.tatum.io/", { method: "POST", headers: H(), body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}
