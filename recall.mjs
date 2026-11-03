import { mw, NS } from "./client.mjs";
import fs from "fs";
const query = process.argv[2] || "who is most reliable on SOL calls?";
const r = await mw.recall({ query, limit: 5, namespace: NS });
console.log(JSON.stringify(r, null, 2));
const f = JSON.parse(fs.readFileSync("memories-log.json"));
f.recall = { query, at: new Date().toISOString(), result: r };
fs.writeFileSync("memories-log.json", JSON.stringify(f, null, 2));
