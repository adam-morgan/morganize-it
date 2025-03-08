import dotenv from "dotenv";
dotenv.config();
import { createServer } from "http";
import app from "./restApi.ts";
import { commonExample } from "@/utils/utils.ts";
import { initDb } from "../db/initialize.ts";

commonExample();

const server = createServer();

server.on("request", app);

const init = async () => {
  await initDb();

  server.listen(9001, () => {
    console.log(`API (re)started`);
  });
};

init();
