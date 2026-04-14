import dotenv from "dotenv";
import { createServer } from "http";
import { initDb } from "../db/initialize";
import { debug } from "../logging/index";
import app from "./restApi";
import { attachWebSocketServer } from "./websocket-server";

dotenv.config();

const server = createServer();

server.on("request", app);
attachWebSocketServer(server);

const init = async () => {
  await initDb();

  server.listen(9001, () => {
    debug(`API (re)started`);
  });
};

init();
