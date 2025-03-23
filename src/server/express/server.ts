import dotenv from "dotenv";
import { createServer } from "http";
import { initDb } from "../db/initialize";
import { debug } from "../logging/index";
import app from "./restApi";

dotenv.config();

const server = createServer();

server.on("request", app);

const init = async () => {
  await initDb();

  server.listen(9001, () => {
    debug(`API (re)started`);
  });
};

init();
