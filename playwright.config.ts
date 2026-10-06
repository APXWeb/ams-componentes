import { defineConfig, devices } from "@playwright/test";

/*
 * Testes ponta a ponta com banco e storage isolados (data/test.db, storage-test/).
 * O servidor de teste é um build de produção, recriado a cada execução com dados de demonstração.
 *   npm run test:e2e
 */
const PORT = 3200;
const env = {
  DATABASE_PATH: "data/test.db",
  STORAGE_PATH: "storage-test",
  SITE_URL: `http://localhost:${PORT}`,
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run db:setup && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/rh/login`,
    timeout: 600_000,
    reuseExistingServer: false,
    env,
  },
});
