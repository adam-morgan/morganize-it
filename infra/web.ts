import { api } from "./api";

export const web = new sst.aws.StaticSite("MorganizeItWeb", {
  path: ".",
  build: {
    command: "npm run vite:build",
    output: ".local/vite/dist",
  },
  dev: {
    command: "npm run vite:dev",
    url: "http://localhost:9000",
  },
  domain:
    $app.stage === "prod"
      ? {
          dns: false,
          name: "notes.adammorgan.ca",
          cert: "REPLACE_WITH_ACM_CERT_ARN_US_EAST_1",
        }
      : undefined,
  environment: {
    VITE_API_URL: api.url,
  },
});
