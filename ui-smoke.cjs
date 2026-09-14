const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
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
  const errors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ url: page.url(), msg: msg.text() });
    }
  });

  page.on("pageerror", (err) => {
    errors.push({ url: page.url(), msg: err.message });
  });

  for (const path of PAGES) {
    try {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(1500);
      const title = await page.title();
      console.log(`OK ${path} — ${title}`);
    } catch (e) {
      console.log(`FAIL ${path} — ${e.message}`);
      errors.push({ url: BASE + path, msg: e.message });
    }
  }

  await browser.close();

  if (errors.length > 0) {
    console.log("\nConsole/errors:");
    errors.forEach((e) => console.log(`- ${e.url}: ${e.msg}`));
    process.exit(1);
  } else {
    console.log("\nNo console errors across pages.");
  }
})();
