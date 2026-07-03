import puppeteer from "puppeteer";
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const outDir = "/opt/cursor/artifacts/screenshots";
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

function serve(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const path = join(root, urlPath === "/" ? "index.html" : urlPath.replace(/^\//, ""));
  if (!path.startsWith(root) || !existsSync(path) || statSync(path).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": mime[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
}

const server = createServer(serve);
await new Promise((resolve) => server.listen(8765, "127.0.0.1", resolve));

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(name, setup, viewport = { width: 1280, height: 720 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto("http://127.0.0.1:8765/?shot=1", { waitUntil: "networkidle0" });
  await page.click("#title-screen");
  await page.waitForFunction(() => window.__shot?.forceEncounter);
  await sleep(800);
  await setup(page);
  await sleep(600);
  const path = `${outDir}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  await page.close();
  console.log("saved", path);
}

await capture("01-encounter-blackout", async (page) => {
  await page.evaluate(() => {
    window.__shot.forceEncounter("action");
    window.__shot.setZoomProgress(0.06);
  });
});

await capture("02-encounter-zoom-in", async (page) => {
  await page.evaluate(() => {
    window.__shot.forceEncounter("action");
    window.__shot.setZoomProgress(0.35);
  });
});

await capture("03-encounter-widen", async (page) => {
  await page.evaluate(() => {
    window.__shot.forceEncounter("action");
    window.__shot.setZoomProgress(0.78);
  });
});

await capture("04-action-combat-desktop", async (page) => {
  await page.evaluate(() => {
    window.__shot.forceEncounter("action");
    window.__shot.setZoomProgress(1);
    window.__shot.swing();
  });
  await sleep(200);
});

await capture("05-rpg-combat-desktop", async (page) => {
  await page.evaluate(() => {
    window.__shot.forceEncounter("rpg");
    window.__shot.setZoomProgress(1);
  });
});

await capture("06-action-combat-mobile", async (page) => {
  await page.evaluate(() => {
    window.__shot.forceEncounter("action");
    window.__shot.setZoomProgress(1);
    window.__shot.swing();
  });
  await sleep(200);
}, { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

await browser.close();
server.close();
console.log("done");
