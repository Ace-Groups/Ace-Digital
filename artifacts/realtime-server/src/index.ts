import http from "node:http";
import {
  attachWebSocketServer,
  createChannelSubscribeChecker,
  createDefaultHubOptions,
  createHub,
  setGlobalHub,
  startRedisSubscriber,
} from "@workspace/realtime-hub";

const rawPort = process.env.PORT;
if (!rawPort) {
  throw new Error("PORT environment variable is required");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT: "${rawPort}"`);
}

const hub = createHub(createDefaultHubOptions(createChannelSubscribeChecker()));
setGlobalHub(hub);

const server = http.createServer((req, res) => {
  if (req.url?.split("?")[0] === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "ace-realtime" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

attachWebSocketServer(server, hub);

let stopRedis = async () => {};

void startRedisSubscriber(hub).then((stop) => {
  stopRedis = stop;
});

server.listen(port, () => {
  console.info(`[realtime-server] listening on ${port}`);
});

async function shutdown() {
  await stopRedis();
  server.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
