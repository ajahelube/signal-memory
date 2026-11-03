# Signal Memory: a crypto research agent that remembers who was right

*By Ajah (@ajah_elube), built for the Walrus x Tatum Total Recall hackathon*

## The problem

If you spend your days in crypto Twitter like I do, you know the feeling. Someone posts a confident call. SOL to $200. BTC below $90k. A launchpad about to cut fees. The post goes viral, and two weeks later nobody remembers whether it came true. The same voices keep the same reach whether they were right or wrong.

I write research threads and coach thousands of creators in the Support System community. The hardest part of good research is not finding opinions. It is knowing whose opinions have earned your trust. Our timelines have no memory, and most AI tools have no memory either. Every chat starts from zero.

So I built an agent that never forgets a call.

## What Signal Memory does

Signal Memory is a research agent that tracks claims made by crypto sources and keeps score.

1. **Log a claim.** You enter who said it, the asset, the direction, the target price and the deadline. The agent saves that claim to its long term memory.
2. **Resolve it automatically.** When the deadline comes, the agent pulls the live price, checks whether the call came true, and marks it RIGHT or WRONG.
3. **Update the trust score.** Each source gets a score from 0 to 100. Right calls push it up, wrong calls pull it down, and the new score is saved back to memory with the outcome.
4. **Ask the agent.** You can ask plain questions like "who is most reliable on SOL calls?" and the agent recalls the most relevant memories and answers from its own track record.

The app itself is simple on purpose: a live price strip, a trust leaderboard, a form to log claims, and an "Ask the agent" box.

For the demo, every source is a fictional sample handle like @alpha_sample or @degen_demo. I did not want to score real people without their consent.

## How it uses Walrus Memory

Walrus Memory is the brain. Every claim, every outcome and every score change is written to Walrus Memory on Sui mainnet under one namespace called `trust-scores`.

Each save waits for a real receipt. The SDK call `rememberAsync` returns a job, and `waitForRememberJob` returns a `blob_id` once the memory is stored. I log every `blob_id` in the repo as proof. So far the agent holds 14 memories on mainnet, including one claim and one outcome created live through the app.

Recall is semantic. When you ask a question, Walrus Memory returns the closest memories by meaning, not just by keyword. Asking about "reliable SOL calls" brings back the outcomes where @alpha_sample was right, even though the word "reliable" never appears in them.

Because the memory lives on Walrus and not inside my laptop, the agent's track record is portable and verifiable. Anyone with the blob ids can check that the history was written when I say it was.

## How it uses Tatum

Tatum is the agent's eyes on the market. The resolver calls the Tatum Data API for live SOL, BTC, ETH and SUI prices in US dollars, and that price decides whether a call was right. The project also includes a helper for Tatum's Sui mainnet RPC gateway, so the agent can read onchain data on the same network where its memory lives.

One honest detail: Tatum needs a free API key. When the key is set, every price is tagged `tatum`. If it is missing, the app falls back to a public price feed and labels the result clearly, so a judge or a user can always see where a number came from.

## How it learns over time

This is the part I care about most. A trust score should not be a popularity score, and it should not be stuck in the past either.

Every resolved call counts as plus one if right and minus one if wrong. Then each call is weighted by how recent it is, with a 30 day half life. A call from today counts fully, a call from a month ago counts half, and a call from two months ago counts a quarter. The score is:

score = 50 + 50 × (weighted sum of outcomes) ÷ (sum of weights + 2)

The extra 2 in the bottom works like a cautious first impression. A brand new source starts at 50 and has to earn its way up or down. One lucky call cannot make anyone a legend overnight.

That means the agent changes its mind as the world changes. A source who was great last quarter but has been missing lately will slide down. A quiet newcomer who keeps getting it right will climb. And because every step is saved in Walrus Memory, the agent can explain why a score moved, not just what it is.

## Demo results

I seeded the agent with 12 sample memories covering six claims across SOL, BTC, ETH and SUI, plus a leaderboard snapshot. Then I logged a fresh claim through the app: @live_demo says SOL stays above $90. The resolver fetched the live SOL price, marked the call RIGHT, and moved @live_demo from 50 to 67. Both the claim and the outcome came back with real `blob_id` receipts from mainnet.

The current leaderboard looks like this:

| Source | Trust | Right | Wrong |
|---|---|---|---|
| @alpha_sample | 72 | 2 | 0 |
| @live_demo | 67 | 1 | 0 |
| @suiwatch_sample | 66 | 1 | 0 |
| @degen_demo | 37 | 0 | 1 |
| @chartwizard_demo | 36 | 0 | 1 |
| @ethmaxi_sample | 34 | 0 | 1 |

When I asked "who is most reliable on SOL calls?", the agent recalled the two outcomes where @alpha_sample was right as its top matches and named @alpha_sample as the most reliable SOL source.

## What's next

1. **Real sources, with consent.** Let creators opt in so their followers can see a verified track record.
2. **More claim types.** Onchain volume, TVL and token unlocks, resolved through Tatum data across many chains.
3. **Per topic scores.** Someone can be great on Solana memecoins and terrible on Bitcoin macro. Scores should reflect that.
4. **A community layer.** In Support System we run contests and campaigns every week. A shared memory of who called what would make our research stronger for everyone.

Crypto moves fast and forgets faster. Signal Memory is my small step toward a timeline that remembers.

**Code:** https://github.com/ajahelube/signal-memory
