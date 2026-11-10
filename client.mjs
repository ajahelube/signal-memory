import { MemWal } from "@mysten-incubation/memwal";
export const NS = "trust-scores";
const KEY = process.env.MEMWAL_PRIVATE_KEY || "";
export const hasMemWal = () => /^(0x)?[0-9a-fA-F]{64}$/.test(KEY.trim());
let _mw = null;
// Created lazily so a missing or bad key does not crash the whole server at import time.
export function getMw() {
  if (!hasMemWal()) throw new Error("MEMWAL_PRIVATE_KEY is missing or not a 64 character hex key");
  return _mw ??= MemWal.create({ key: KEY.trim(), accountId: "0x34460a5e49be15c45a947d770ce887f958a9453028d51fa41b56662e6c5cb6ca", serverUrl: "https://relayer.memory.walrus.xyz" });
}
export const mw = new Proxy({}, { get: (_, p) => { const m = getMw(); const v = m[p]; return typeof v === "function" ? v.bind(m) : v; } });
// Save a memory and wait for the Walrus blob receipt.
export async function rememberWait(text) {
  const acc = await mw.rememberAsync(text, NS);
  const r = await mw.waitForRememberJob(acc.job_id ?? acc.jobId, { timeoutMs: 300000 });
  return r.blob_id ?? r.blobId;
}
