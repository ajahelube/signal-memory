// Tiny local server: node server.mjs  ->  http://localhost:3000
import http from "http";
import handler from "./app.mjs";
http.createServer(handler).listen(process.env.PORT || 3000, () => console.log("Signal Memory on http://localhost:" + (process.env.PORT || 3000)));
