import esbuild from "esbuild";
import { rmSync } from "fs";

// Remove the previous build directory
rmSync("./.local/express/dist", { recursive: true, force: true });

const commonBuildOptions = {
  sourcemap: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  tsconfig: "./tsconfig.json",
};

const buildMigrations = async () => {
  const buildOptions = {
    ...commonBuildOptions,
    entryPoints: ["src/server/db/sql/migrations/*.ts"],
    outdir: "./.local/express/dist/migrations",
  };

  await esbuild.build(buildOptions);
};

const build = async () => {
  const buildOptions = {
    ...commonBuildOptions,
    entryPoints: ["src/server/express/server.ts"],
    bundle: true,
    external: [
      "better-sqlite3",
      "mysql",
      "mysql2",
      "oracledb",
      "pg-query-stream",
      "sqlite3",
      "tedious",
    ],
    outfile: "./.local/express/dist/api.js",
  };

  await buildMigrations();

  const args = process.argv.slice(2);
  if (args.includes("--watch")) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
  } else {
    await esbuild.build(buildOptions);
  }
};

// Run esbuild with the specified options
build().catch((e) => {
  console.error(e);
  process.exit(1);
});
