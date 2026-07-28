const { chromium } = require("playwright-core");

(async () => {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  const errors = [];
  const consoleMsgs = [];

  page.on("console", (msg) => {
    consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    errors.push(err.stack || err.message);
  });
  page.on("requestfailed", (req) => {
    consoleMsgs.push(`[requestfailed] ${req.url()} - ${req.failure()?.errorText}`);
  });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: "/private/tmp/claude-501/-Users-shashankmasireddy-Downloads-hyd-map-app-2/aec4b0e0-7ad6-47e2-8317-ef28e8fc4c05/scratchpad/screenshot.png", fullPage: true });

  console.log("=== PAGE ERRORS ===");
  console.log(errors.join("\n---\n") || "(none)");
  console.log("\n=== CONSOLE MESSAGES ===");
  console.log(consoleMsgs.join("\n"));

  await browser.close();
})().catch((e) => {
  console.error("SCRIPT FAILED:", e);
  process.exit(1);
});
