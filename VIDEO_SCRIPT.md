# Signal Memory: Demo Video Script (2:30)

For: Walrus x Tatum Total Recall hackathon submission. Format 16:9, 1920×1080, 30fps. Voice: warm, confident, conversational (Ajah's voice or a matching narrator). Palette: app dark navy `#0b0f17`, panel `#121a26`, mint accent `#7ee0c3`, green buttons `#22bb66`, red for WRONG `#ff5c6c`. Font: Inter / system sans.

Note: all sources shown are fictional sample handles. Keep the small "Sample sources are fictional" line visible whenever the leaderboard is on screen.

---

## Scene 1: Hook (0:00 to 0:15)
**VO:** "Every day on crypto Twitter, someone makes a big call. SOL to two hundred. Bitcoin under ninety k. Two weeks later, nobody remembers if they were right."
**Visuals:** Fast stack of mock tweet cards (fictional handles) sliding in, each with a bold price target.
**Motion:** Cards cascade in with slight rotation, then all fade to grey and dissolve like dust, leaving an empty dark frame. Text pops: **"The timeline has no memory."**

## Scene 2: Introduce Signal Memory (0:15 to 0:30)
**VO:** "So I built Signal Memory. A research agent that never forgets a call, and keeps score on who was actually right."
**Visuals:** Logo wordmark "Signal Memory" in mint. Under it: "Walrus Memory on Sui mainnet · Tatum data".
**Motion:** Wordmark draws in letter by letter; Walrus and Tatum logos slide in from either side and lock beneath it.

## Scene 3: How it works, the loop (0:30 to 0:55)
**VO:** "It works in a loop. Log a claim. When the deadline hits, Tatum checks the live price. The agent marks it right or wrong, updates the source's trust score, and saves everything to Walrus Memory."
**Visuals:** Circular 4 step diagram: Log claim → Tatum price check → RIGHT / WRONG → Trust score saved to Walrus.
**Motion:** A glowing dot travels around the loop; each node lights up as the VO names it. On the Walrus node, a small "blob_id ✓" receipt pops out.

## Scene 4: App walkthrough, live prices and leaderboard (0:55 to 1:15)
**VO:** "Here's the app. Live prices come in through Tatum. Below that is the trust leaderboard. Right calls push a source up, wrong calls pull them down."
**Visuals:** Screen capture S1 then S2 (see walkthrough). 
**Motion:** Zoom into the price chips; highlight ring on the "source" label. Then pan to the leaderboard; animate scores counting up from 0; green tint on top rows, red tint on bottom rows.

## Scene 5: Log a live claim (1:15 to 1:40)
**VO:** "Let's add a new one. Live demo says SOL stays above ninety dollars. I hit save, and that claim is written to Walrus Memory on mainnet. Here's the receipt."
**Visuals:** Screen capture S3 and S4.
**Motion:** Cursor highlight on each field as it's filled; on "Save to Walrus" click, a pulse ripple. Callout box zooms onto the returned `blob_id` with label **"Stored on Sui mainnet"**.

## Scene 6: Auto resolve with Tatum (1:40 to 1:55)
**VO:** "Now I resolve it. The agent pulls SOL's live price, sees the call was right, and moves the trust score from fifty to sixty seven. That outcome gets its own receipt too."
**Visuals:** Screen capture S5, then S6 (leaderboard with @live_demo at 67).
**Motion:** Big overlay "RIGHT ✓" stamp in green; number ticker 50 → 67; the @live_demo row slides up into position 2.

## Scene 7: Ask the agent (1:55 to 2:10)
**VO:** "And you can just ask. Who is most reliable on SOL calls? It recalls its own memories, and the answer is alpha sample, two for two."
**Visuals:** Screen capture S7.
**Motion:** Typewriter effect on the question; recalled memories fade in one by one; highlight "@alpha_sample ... RIGHT" lines in mint.

## Scene 8: How it learns (2:10 to 2:22)
**VO:** "Scores fade with time, with a thirty day half life. Recent calls matter most, and new sources start at fifty until they earn it."
**Visuals:** Formula card: `score = 50 + 50 × Σ(w·outcome) ÷ (Σw + 2)` and `w = 0.5^(age/30 days)`.
**Motion:** Simple decay curve draws from left to right; three dots on it labeled "today 1.0", "30d 0.5", "60d 0.25".

## Scene 9: Close (2:22 to 2:30)
**VO:** "Crypto moves fast and forgets faster. Signal Memory remembers. Built on Walrus and Tatum."
**Visuals:** Wordmark again, plus "github.com/ajahelube/signal-memory" and "@ajah_elube".
**Motion:** Fade in, hold 3 seconds, logos at bottom.

---

## Screen walkthrough: exact captures needed

Run locally: `npm install`, set `MEMWAL_PRIVATE_KEY` (and `TATUM_API_KEY` so prices say `source: tatum`), `node server.mjs`, open `http://localhost:3000`. Browser at 1440×900, zoom 125%.

| ID | Screen | Action to record | Length |
|---|---|---|---|
| S1 | Top of page: title + **Live prices** panel | Page load; hold on SOL/BTC/ETH/SUI chips and the `source:` line | 5s |
| S2 | **Trust leaderboard** table | Slow scroll so all rows are visible | 6s |
| S3 | **Log a claim** form | Type `@live_demo2`, pick SOL, `above`, target `90`, pick a date next week | 8s |
| S4 | Same panel after clicking **Save to Walrus** | Show "saving to Walrus…" then the returned text + `blob_id` (takes ~10 to 30s; cut the wait) | 6s |
| S5 | Click **Resolve open claims (Tatum)** | Show the outcome line "call was RIGHT ... Trust score 50 -> 67" + `blob_id` | 6s |
| S6 | Leaderboard after resolve | New source appears near the top with score 67 | 4s |
| S7 | **Ask the agent** panel | Question "who is most reliable on SOL calls?", click **Recall**, show results | 8s |
| S8 (optional) | `README.md` on GitHub, proof table of blob_ids | Scroll through the table | 4s |

A still of the full page is in `screenshots/app.png` for reference.
