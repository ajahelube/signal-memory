// Kite Passport payment step for Spend Guard, behind one small interface.
//
//   KITE_MODE=dry-run (default)  Nothing is paid. Returns the exact kpass commands that WOULD run, marked simulated.
//   KITE_MODE=kpass              Real payments through the Kite Passport CLI (kpass) on the machine running the server.
//                                Needs: kpass installed and signed in, a passkey, and USDC.e on Kite chain. See KITE_SETUP.md.
//
// The SERV decision sets the cap; this module turns it into a Kite spending session with that cap,
// so Kite (not the app) enforces the limit the user approved with their passkey.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);

export const KITE_MODE = (process.env.KITE_MODE || "dry-run").toLowerCase() === "kpass" ? "kpass" : "dry-run";
// Kite catalog x402 test service, used as a clearly labelled fallback if swap.io (Solana x402) cannot be paid from Kite.
export const KITE_FALLBACK_URL = "https://x402.dev.gokite.ai/api/weather?location=Abuja";
export const KITE_PAY_URL = process.env.KITE_PAY_URL || "https://hermes.swap.io/v1/swap/quote";
const KPASS = process.env.KPASS_BIN || "kpass";

function sessionArgs({ summary, maxPerTx, maxTotal, ttl }) {
  return ["agent:session", "create", "--task-summary", summary, "--max-amount-per-tx", String(maxPerTx),
    "--max-total-amount", String(maxTotal), "--ttl", ttl, "--assets", "USDC", "--output", "json"];
}
function executeArgs({ url, method, body }) {
  const a = ["agent:session", "execute", "--url", url, "--method", method, "--output", "json"];
  if (body) a.push("--headers", JSON.stringify({ "Content-Type": "application/json" }), "--body", JSON.stringify(body));
  return a;
}
const shown = (args) => ["kpass", ...args.map(a => /\s|"/.test(a) ? `'${a}'` : a)].join(" ");

async function kpass(args) {
  const { stdout } = await run(KPASS, args, { timeout: 60000, maxBuffer: 1 << 20 });
  try { return JSON.parse(stdout); } catch { return { raw: stdout.trim() }; }
}

export function kitePayer() {
  if (KITE_MODE === "kpass") return {
    mode: "kpass",
    simulated: false,
    async createSession(o) {
      const r = await kpass(sessionArgs(o));
      return { simulated: false, ...o, result: r, requestId: r.request_id || r.requestId || null, approvalUrl: r.approval_url || r.approvalUrl || r.url || null };
    },
    async execute(o) { const r = await kpass(executeArgs(o)); return { simulated: false, url: o.url, result: r }; },
    async waitForApproval(requestId) { return { simulated: false, result: await kpass(["agent:session", "status", "--request-id", requestId, "--wait", "--output", "json"]) }; },
    async status() { return { simulated: false, sessions: await kpass(["agent:session", "list", "--status", "active", "--output", "json"]) }; }
  };
  return {
    mode: "dry-run",
    simulated: true,
    async createSession(o) {
      return { simulated: true, ...o, approvalUrl: null, command: shown(sessionArgs(o)),
        note: "DRY RUN. No Kite session was created and nothing was paid. With KITE_MODE=kpass this command creates a real session that you approve with your passkey." };
    },
    async execute(o) {
      return { simulated: true, url: o.url, command: shown(executeArgs(o)),
        note: "DRY RUN. No payment was made. With KITE_MODE=kpass this command pays the x402 price from the approved session." };
    },
    async waitForApproval() { return { simulated: true, note: "DRY RUN. No approval needed." }; },
    async status() { return { simulated: true, sessions: [] }; }
  };
}
