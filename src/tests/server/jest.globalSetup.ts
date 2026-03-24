import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const globalSetup = async (): Promise<void> => {
  // Migrations and seeds run per-worker in jest.setup.ts
  // (required for in-memory SQLite where each worker has its own DB)
};

export default globalSetup;
