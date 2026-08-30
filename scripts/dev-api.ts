import http from "node:http";
import { parse } from "node:url";

import healthHandler from "../frontend/api/health.js";
import matchHandler from "../frontend/api/match.js";
import parseIntentHandler from "../frontend/api/parse-intent.js";
import detectClustersHandler from "../frontend/api/detect-clusters.js";
import candidatesHandler from "../frontend/api/candidates.js";
import foundersHandler from "../frontend/api/founders.js";
import organisationsHandler from "../frontend/api/organisations.js";
import liveIntentsHandler from "../frontend/api/live-intents.js";

const routes: Record<string, (req: any, res: any) => any> = {
  "/api/health": healthHandler,
  "/api/match": matchHandler,
  "/api/parse-intent": parseIntentHandler,
  "/api/detect-clusters": detectClustersHandler,
  "/api/candidates": candidatesHandler,
  "/api/founders": foundersHandler,
  "/api/organisations": organisationsHandler,
  "/api/live-intents": liveIntentsHandler,
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const { pathname } = parse(req.url || "/");
  const handler = routes[pathname || ""];

  if (!handler) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  let body: any = {};
  if (req.method === "POST") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    try {
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      body = {};
    }
  }

  const vercelReq: any = req;
  vercelReq.body = body;
  vercelReq.query = Object.fromEntries(new URLSearchParams(parse(req.url || "/").query || ""));

  const vercelRes: any = res;
  vercelRes.status = (code: number) => {
    res.statusCode = code;
    return vercelRes;
  };
  vercelRes.json = (data: any) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
    return vercelRes;
  };

  try {
    await handler(vercelReq, vercelRes);
  } catch (err: any) {
    console.error(`Error in ${pathname}:`, err);
    if (!res.writableEnded) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Internal server error" }));
    }
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`API dev server running on http://localhost:${PORT}`);
});
