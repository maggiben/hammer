import { strict as assert } from "node:assert";

import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

import { chromium } from 'playwright';

import type { Browser,  Page } from 'playwright';

async function shutdown(browser: Browser, code = 0) {
    try {
        if (browser) {
            console.log("Closing browser...");
            await browser.close();
        }
    } catch (error) {
        console.error("Browser cleanup error:", error);
    }
    return process.exit(code);
}

export async function runActions(page: Page, browser: Browser, actions: Array<{
    selector: string;
    text: string;
    type: string;
    url: string;
    $eq: number;
    $gt: number;
    $lt: number;
    $gte: number;
    $lte: number;
    code: number;
    ms: number;
}>) {
    const failures = [];


    for (const action of actions) {
        switch (action.type) {

            case "click": {
                // console.log("cooossa", await page.locator('h1').textContent())
                // console.log("html", await page.content())
                await page.locator(action.selector).click();
                break;
            }

            case "type":
                await page.locator(action.selector).fill(action.text);
                break;

            case "submit":
                await page.locator(action.selector).press("Enter");
                break;

            case "throw":
                throw new Error("not working");

            case "exists": {
                try {
                    const count = await page.locator(action.selector).count();
                    assert.ok(count > 0, `❌ Expected element ${action.selector} to exist`);
                } catch (error) {
                    console.error(error);
                    failures.push(error);
                }
                break;
            }

            case "contains": {
                try {
                    const text = await page.locator(action.selector).innerText();
                    assert.ok(
                        text.includes(action.text),
                        `❌ Expected element text to contain "${action.text}", but got "${text}"`
                    );
                } catch (error) {
                    console.error(error);
                    failures.push(error);
                }
                break;
            }

            case "count": {
                const locator = page.locator(action.selector);
                const count = await locator.count();

                const operators = ['$eq', '$gt', '$lt', '$gte', '$lte'];
                const op = operators.find(o => o in action);

                if (op) {
                    try {
                        switch (op) {
                            case "$eq":
                                assert.strictEqual(count, action.$eq,
                                    `❌ Expected ${action.$eq} elements, found ${count}`);
                                break;

                            case "$gt":
                                assert.ok(count > action.$gt,
                                    `❌ Expected > ${action.$gt}, found ${count}`);
                                break;

                            case "$lt":
                                assert.ok(count < action.$lt,
                                    `❌ Expected < ${action.$lt}, found ${count}`);
                                break;

                            case "$gte":
                                assert.ok(count >= action.$gte,
                                    `❌ Expected >= ${action.$gte}, found ${count}`);
                                break;

                            case "$lte":
                                assert.ok(count <= action.$lte,
                                    `❌ Expected <= ${action.$lte}, found ${count}`);
                                break;
                        }
                    } catch (error) {
                        console.error(error);
                        failures.push(error);
                    }
                }
                break;
            }

            case "wait":
                await page.waitForTimeout(action.ms);
                break;

            case "goto":
            case "navigate": {
                console.log(`GoTo: ${action.url}`)
                try {
                    await page.goto(action.url);

                    const current = await page.url();
                    assert.ok(
                        current.includes(new URL(action.url).hostname),
                        `Navigation failed. Current URL: ${current}`
                    );
                } catch (error) {
                    console.error(error);
                    failures.push(error); // collect errors
                }
                break;
            }

            case "deleteAllCookies":
                await page.context().clearCookies();
                break;

            case "quit":
                return shutdown(browser, action.code || failures.length);
                break;

            default: {
                console.warn("Unknown action:", action);
                break;
            }
        }
    }
}

