// Trust score math. Each resolved claim counts +1 (right) or -1 (wrong), weighted by recency:
// w = 0.5 ^ (ageDays / 30)  (a 30 day half life, so old calls fade).
// score = 50 + 50 * sum(w * outcome) / (sum(w) + 2)   (the +2 prior keeps new sources near 50).
import fs from "fs";
export const FILE = new URL("./claims.json", import.meta.url);
export const load = () => JSON.parse(fs.readFileSync(FILE));
export const save = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));
export function score(claims, source, now = Date.now()) {
  let num = 0, den = 0, right = 0, wrong = 0;
  for (const c of claims) if (c.source === source && c.outcome) {
    const w = Math.pow(0.5, (now - Date.parse(c.resolvedAt)) / 86400000 / 30);
    const o = c.outcome === "RIGHT" ? 1 : -1; o > 0 ? right++ : wrong++;
    num += w * o; den += w;
  }
  return { source, score: Math.round(50 + 50 * num / (den + 2)), right, wrong };
}
export function leaderboard(claims) {
  return [...new Set(claims.map(c => c.source))].map(s => score(claims, s)).sort((a, b) => b.score - a.score);
}
