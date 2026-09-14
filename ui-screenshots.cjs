const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const OUT = path.resolve("ui-reports");
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  "/",
  "/weather",
  "/weather/incident",
  "/weather/subscribe",
  "/public-report",
  "/login",
  "/signup",
  "/signup/citizen",
  "/admin",
  "/field-observations",
  "/admin/subscriptions",
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1440, height: 900 });

  for (const p of PAGES) {
    const name = p.replace(/\//g, "_").replace(/^_/, "root");
    const file = path.join(OUT, `${name}.png`);
    try {
      await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`screenshot ${p} -> ${file}`);
    } catch (e) {
      console.log(`failed ${p}: ${e.message}`);
    }
  }

  await browser.close();
})();
