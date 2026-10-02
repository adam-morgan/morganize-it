/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "morganize-it",
      removal: input?.stage === "prod" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "ca-central-1",
          profile: process.env.GITHUB_ACTIONS ? undefined : "personal",
        },
      },
    };
  },
  async run() {
    await import("./infra/storage");
    await import("./infra/api");
    await import("./infra/web");
    await import("./infra/dns");
  },
});
