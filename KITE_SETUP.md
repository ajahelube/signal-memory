# Turning on real Kite Passport payments for Spend Guard

Until this is done, Spend Guard runs with `KITE_MODE=dry-run`: the SERV Reasoning decision is real, the Kite step is simulated and every result is labelled **DRY RUN, NOT PAID**.

## What is needed

1. `kpass` installed on the machine that runs the server: `curl -fsSL https://cli.gokite.ai/install.sh | bash`
2. Signed in to Kite Passport (email verification link, then the 8 character code), with a passkey created on the dashboard.
3. USDC.e on Kite chain in the Passport wallet. One swap.io quote is about 0.003 USDC, so 1 USDC is plenty. Check with `kpass wallet balance`.
4. Environment for the server:

```
KITE_MODE=kpass
KITE_PAY_URL=https://hermes.swap.io/v1/swap/quote   # default
KPASS_BIN=kpass                                     # optional, path to the CLI
```

## Flow in real mode

1. `POST /api/spend-guard` with the question. If SERV says yes and the price fits, the server runs `kpass agent:session create` with per tx = total = the SERV cap and a 30 minute TTL, and returns `approvalUrl` and `requestId`.
2. Open `approvalUrl` on the phone that holds the passkey and approve.
3. `POST /api/spend-guard/pay` with `{ "requestId": "..." }`. The server waits for approval (`kpass agent:session status --wait`) and runs `kpass agent:session execute` against swap.io.

## Known risk

swap.io charges through x402 on Solana; Kite Passport pays USDC.e on Kite chain. Whether Kite can pay swap.io's 402 directly is UNVERIFIED. If it cannot, send `{ "requestId": "...", "fallback": true }` to pay the Kite catalog test service instead. The response is labelled "Kite catalog test service (fallback), not a swap.io payment". Never describe a fallback payment as a swap.io payment.

`/api/spend-guard/pay` is refused on public deployments (`VERCEL` or `READ_ONLY=1`), because real payments must only run on the owner's machine.
