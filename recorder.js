import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";

export async function recordSession(driver, dir) {

  console.log("Injecting recorder UI...");

  await driver.executeScript(`
    window.__recorded = [];
    window.__recordingActive = true;

    function selector(el){
      if(el.id) return "#" + el.id;
      return el.tagName.toLowerCase();
    }

    document.addEventListener("click", e => {
      if (!window.__recordingActive) return;

      window.__recorded.push({
        type:"click",
        selector: selector(e.target)
      });
    });

    document.addEventListener("input", e => {
      if (!window.__recordingActive) return;

      window.__recorded.push({
        type:"type",
        selector: selector(e.target),
        text: e.target.value
      });
    });

    // ----- CONTROL PANEL -----
    const panel = document.createElement("div");
    panel.style.position="fixed";
    panel.style.top="10px";
    panel.style.right="10px";
    panel.style.zIndex=999999;
    panel.style.background="black";
    panel.style.color="white";
    panel.style.padding="12px";
    panel.style.fontFamily="monospace";
    panel.style.borderRadius="8px";

    panel.innerHTML = \`
      <div>Selenium Recorder</div>
      <button id="stoprec">Stop & Save</button>
    \`;

    document.body.appendChild(panel);

    document.getElementById("stoprec").onclick = () => {
      window.__recordingActive = false;
      window.__stopRequested = true;
    };
  `);

  console.log("Recorder running. Use browser overlay to save.");

  // Poll browser for stop signal
  while (true) {
    const stop = await driver.executeScript(
      "return window.__stopRequested === true"
    );

    if (stop) break;

    await new Promise(r => setTimeout(r, 1000));
  }

  const actions = await driver.executeScript(
    "return window.__recorded"
  );

  const file = path.join(dir, `${uuid()}.json`);

  fs.writeFileSync(file, JSON.stringify({ actions }, null, 2));

  console.log("Recording saved:", file);
}
