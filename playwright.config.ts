import { defineConfig, devices } from "@playwright/test";

/*
 * Testes ponta a ponta da demonstração (site + RH). Os dados vivem no navegador, então cada
 * teste começa com os dados iniciais. O servidor de teste é um build de produção.
 *   npm run test:e2e
 */
const PORT = 3200;
const env = { SITE_URL: `http://localhost:${PORT}` };

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
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/rh/login`,
    timeout: 600_000,
    reuseExistingServer: false,
    env,
  },
});
