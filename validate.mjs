import { mw, NS } from "./client.mjs";
console.log("health:", JSON.stringify(await mw.health()));
try { const r = await mw.recall({ query: "test", limit: 1, namespace: NS }); console.log("recall ok:", JSON.stringify(r).slice(0,500)); }
catch (e) { console.log("recall error:", e?.name, e?.message, e?.status ?? ""); process.exit(1); }
