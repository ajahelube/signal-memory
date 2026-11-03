import { MemWal } from "@mysten-incubation/memwal";
export const NS = "trust-scores";
export const mw = MemWal.create({ key: process.env.MEMWAL_PRIVATE_KEY, accountId: "0x34460a5e49be15c45a947d770ce887f958a9453028d51fa41b56662e6c5cb6ca", serverUrl: "https://relayer.memory.walrus.xyz" });
// Save a memory and wait for the Walrus blob receipt.
export async function rememberWait(text) {
  const acc = await mw.rememberAsync(text, NS);
  const r = await mw.waitForRememberJob(acc.job_id ?? acc.jobId, { timeoutMs: 300000 });
  return r.blob_id ?? r.blobId;
}
