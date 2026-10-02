import { api, googleClientId, wsApi } from "./api";

export const web = new sst.aws.StaticSite("MorganizeItWeb", {
  path: ".",
  build: {
    command: "npm run vite:build",
    output: ".local/vite/dist",
  },
  assets: {
    // IMPORTANT: SST only serves files that match a fileOptions glob — anything
    // matching none returns 403. So these rules MUST cover every file. The two
    // globs are mutually exclusive (via `ignore`), so coverage is total and
    // independent of match-ordering semantics.
    fileOptions: [
      {
        // HTML, the service worker, and the manifest must always revalidate so
        // new deploys are picked up (a cached sw.js would strand the PWA).
        files: ["**/*.html", "sw.js", "manifest.json"],
        cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
      },
      {
        // Everything else (hashed JS/CSS, images, icons, fonts, ...): immutable.
        files: ["**"],
        ignore: ["**/*.html", "sw.js", "manifest.json"],
        cacheControl: "max-age=31536000,public,immutable",
      },
    ],
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
    VITE_WS_URL: wsApi.url,
    VITE_GOOGLE_CLIENT_ID: googleClientId.value,
  },
});
