const globalTeardown = async (): Promise<void> => {
  // Cleanup handled per-worker in jest.setup.ts afterAll
};

export default globalTeardown;
