import fs from "fs";

import { Builder } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

import { chromium } from "playwright";

import { runActions as runSelenium } from "./selenium.js";
import { runActions as runPlaywright } from "./playwright.js";
import { recordSession } from "./recorder.js";

const ENGINE = process.env.ENGINE || "selenium";

const SELENIUM_REMOTE_URL = process.env.SELENIUM_REMOTE_URL;
const PLAYWRIGHT_WS_ENDPOINT = process.env.PLAYWRIGHT_WS_ENDPOINT;

const TARGET_URL = process.env.TARGET_URL || "https://example.com";
const MODE = process.env.MODE || "play";
const CONFIG_PATH = process.env.CONFIG_PATH;
const RECORDINGS_DIR = process.env.RECORDINGS_DIR;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

//
// ---------- SELENIUM ----------
//
async function createDriver() {
  const options = new chrome.Options();
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");

  return new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .usingServer(SELENIUM_REMOTE_URL)
    .build();
}

async function connectSelenium() {
  const MAX_RETRIES = 30;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`Connecting to Selenium (${i+1}/${MAX_RETRIES})`);
      const driver = await createDriver();

      await driver.getTitle(); // ping
      console.log("Connected to Selenium ✅");

      return { driver };
    } catch (error) {
      console.error(error);
      console.log("Waiting for Selenium...");
      await sleep(2000);
    }
  }

  throw new Error("Failed to connect to Selenium after retries");
}

//
// ---------- PLAYWRIGHT ----------
//
async function connectPlaywright() {
  const MAX_RETRIES = 30;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`Connecting to Playwright (${i+1}/${MAX_RETRIES})`);

      let browser;


      console.log('PLAYWRIGHT_WS_ENDPOINT', PLAYWRIGHT_WS_ENDPOINT);

      if (PLAYWRIGHT_WS_ENDPOINT) {
        browser = await chromium.connect({
          wsEndpoint: PLAYWRIGHT_WS_ENDPOINT,
          timeout: 60000
        });
      } else {
        browser = await chromium.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage"
          ],
        });
      }

      const context = await browser.newContext();
      const page = await context.newPage();

      await page.title(); // ping
      console.log("Connected to Playwright ✅");

      return { browser, page };
    } catch (error) {
      console.error(error);
      console.log("Waiting for Playwright...");
      await sleep(2000);
    }
  }

  throw new Error("Failed to connect to Playwright after retries");
}

//
// ---------- SHUTDOWN ----------
//
async function shutdown(resources, code = 0) {
  try {
    if (resources?.driver) {
      console.log("Closing Selenium...");
      await resources.driver.quit();
    }

    if (resources?.browser) {
      console.log("Closing Playwright...");
      await resources.browser.close();
    }
  } catch (e) {
    console.log("Cleanup error:", e.message);
  }

  process.exit(code);
}

//
// ---------- BOOT ----------
//
(async () => {
  const resources =
    ENGINE === "playwright"
      ? await connectPlaywright()
      : await connectSelenium();

  try {
    console.log("Opening:", TARGET_URL);

    if (ENGINE === "playwright") {
      await resources.page.goto(TARGET_URL);
    } else {
      await resources.driver.get(TARGET_URL);
    }

    if (MODE === "record") {
      // (you’d likely branch recorders too later)
      await recordSession(resources.driver, RECORDINGS_DIR);
    } else {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH));

      if (ENGINE === "playwright") {
        console.log('running playwright');
        await runPlaywright(resources.page, resources.browser, config.actions);
      } else {
        console.log('running selenium');
        await runSelenium(resources.driver, config.actions);
      }
    }

    await sleep(5000);

    process.on("SIGINT", () => shutdown(resources, 0));
    process.on("SIGTERM", () => shutdown(resources, 0));

  } finally {
    shutdown(resources, 0);
  }
})();
