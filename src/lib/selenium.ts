import { By, Key } from "selenium-webdriver";
import { strict as assert } from 'node:assert';
import { type WebDriver } from 'selenium-webdriver';

async function shutdown(driver: WebDriver, code = 0) {
    try {
        if (driver) {
            console.log("Closing browser...");
            await driver.quit();
        }
    } catch (error) {
        console.error("Driver cleanup error:", error);
    }
    return process.exit(code);
}


export async function runActions(driver: WebDriver, actions: Array<{
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
                await driver.findElement(By.css(action.selector)).click();
                break;
            }

            case "goto":
                await driver.get(action.url)
                break;

            case "type":
                await driver
                    .findElement(By.css(action.selector))
                    .sendKeys(action.text);
                break;

            case "submit": {
                try {
                    assert.ok(
                        await driver
                            .findElement(By.css(action.selector))
                            .submit()
                    );
                } catch (error) {
                    console.error(error);
                    failures.push(error); // collect errors
                }
                break;
            }

            case "throw":
                throw new Error("not working");
                break;

            case "exists": {
                try {
                    assert.ok(
                        await driver
                            .findElement(By.css(action.selector))
                    );
                } catch (error) {
                    console.error(error);
                    failures.push(error); // collect errors
                }

                break;
            }

            case "contains": {
                const text = await driver
                    .findElement(By.css(action.selector))
                    .getText();

                try {
                    assert.ok(
                        text.includes(action.text),
                        `❌ Expected element text to contain "${action.text}", but got "${text}"`
                    );
                } catch (error) {
                    console.error(error);
                    failures.push(error); // collect errors
                }

                break;
            }
            /*
                action example: { "type": "count", $eq: 7 } || { "type": "count", $lgt: 7 }

                $eq: Matches values equal to a specified value (e.g., { qty: { $eq: 20 } }).
                $gt: Matches values greater than a specified value (e.g., { price: { $gt: 40 } }).
                $lt: Matches values less than a specified value (e.g., { price: { $lt: 20 } }).
                $gte: Greater than or equal to.
                $lte: Less than or equal to. 
            */
            case "count": {
                const elements = await driver.findElements(By.css(action.selector));
                const operators = ['$eq', '$gt', '$lt', '$gte', '$lte'];
                if (operators.some((operator) => action.hasOwnProperty(operator))) {
                    const count = elements.length;
                    switch (operators.find((operator) => operator in action)) {
                        case "$eq": {
                            try {
                                assert.strictEqual(count, action.$eq, `❌ Expected ${action.$eq} elements, but found ${count}`);
                            } catch (error) {
                                console.error(error);
                                failures.push(error); // collect errors
                            }
                            break;
                        }
                        case "$gt": {
                            try {
                                assert.ok(count > action.$gt, `❌ Expected more than ${action.$gt} elements, but found ${count}`);
                            } catch (error) {
                                console.error(error);
                                failures.push(error); // collect errors
                            }
                            break;
                        }
                        case "$lt": {
                            console.log("check less than", count);
                            try {
                                assert.ok(count < action.$lt, `❌ Expected less than ${action.$lt} elements, but found ${count}`);
                            } catch (error) {
                                console.error(error);
                                failures.push(error); // collect errors
                            }
                            break;
                        }
                        case "$gte": {
                            try {
                                assert.ok(count <= action.$gte, `❌ Expected more or equal than ${action.$gte} elements, but found ${count}`);
                            } catch (error) {
                                console.error(error);
                                failures.push(error); // collect errors
                            }
                            break;
                        }
                        case "$lte": {
                            try {
                                assert.ok(count >= action.$lte, `❌ Expected lerr or equal than ${action.$lte} elements, but found ${count}`);
                            } catch (error) {
                                console.error(error);
                                failures.push(error); // collect errors
                            }
                            break;
                        }
                    }
                }
                break;
            }

            case "submit":
                await driver
                    .findElement(By.css(action.selector))
                    .sendKeys(Key.RETURN);
                break;

            case "deleteAllCookies": 
                await driver.manage().deleteAllCookies();
                break;
    
            case "wait":
                await driver.sleep(action.ms);
                break;

            case "goto":
            case "navigate":
                await driver.get(action.url);
                break;

            case "quit": {
                return shutdown(driver, action.code || failures.length);
                break;
            }

            default:
                console.warn("Unknown action:", action);
        }
    }
}
