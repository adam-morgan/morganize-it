import { api, googleClientId } from "./api";

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
          cert: "arn:aws:acm:us-east-1:499854674714:certificate/ef4cb41b-8c3e-4d5f-b377-323bb564a124",
        }
      : undefined,
  environment: {
    VITE_API_URL: api.url,
    VITE_GOOGLE_CLIENT_ID: googleClientId.value,
  },
});
