#!/usr/bin/env node
/**
 * Records the Portfolio demo tour in a hidden Chrome window and writes a 60 fps MP4.
 * Runs in the background, so the laptop stays usable.
 *
 *   npm run dev                      (dapp dev server on :3000)
 *   node scripts/record-demo.mjs [--theme light] [--out demo.mp4] [--url http://localhost:3000]
 *
 * Needs Google Chrome and ffmpeg on the PATH.
 */
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const FPS = 60;
const WIDTH = 1920;
const HEIGHT = 1080;

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const baseUrl = option('url', 'http://localhost:3000');
const theme = option('theme', 'dark');
const out = option('out', `fvc-portfolio-tour-${theme}-${new Date().toISOString().slice(0, 10)}.mp4`);
const chrome = option('chrome', process.env.CHROME_PATH || '/usr/bin/google-chrome');
// Headless Chrome hands over about 15 full-HD frames a second. Playing the tour this many times
// slower and compressing time back gives 60 distinct frames per second of video.
const slow = Number(option('slow', '4'));

const ffmpeg = spawn(
  'ffmpeg',
  [
    '-y',
    '-loglevel', 'error',
    '-f', 'image2pipe',
    '-framerate', String(FPS),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '16',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    out,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] }
);

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [`--window-size=${WIDTH},${HEIGHT}`, '--hide-scrollbars', '--force-device-scale-factor=1'],
  defaultViewport: { width: WIDTH, height: HEIGHT },
});

try {
  const page = await browser.newPage();
  // ?capture=1 autoplays the tour after a short still intro, with every control hidden.
  await page.goto(`${baseUrl}/demo/?capture=1&slow=${slow}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-tour-id="header"]');
  if (theme === 'light') {
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Light');
      button?.click();
    });
  }

  const client = await page.createCDPSession();
  let lastFrame = null;
  let lastTime = null;
  let written = 0;
  let started = null;

  const write = (buffer, count) => {
    for (let i = 0; i < count; i++) ffmpeg.stdin.write(buffer);
    written += count;
  };

  client.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
    await client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    const buffer = Buffer.from(data, 'base64');
    const time = metadata.timestamp;
    if (started === null) started = time;
    if (lastFrame !== null) {
      const due = Math.round(((time - started) / slow) * FPS) - written;
      if (due > 0) write(lastFrame, due);
    }
    lastFrame = buffer;
    lastTime = time;
  });

  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 95,
    maxWidth: WIDTH,
    maxHeight: HEIGHT,
    everyNthFrame: 1,
  });

  console.log(`Recording ${WIDTH}x${HEIGHT} at ${FPS} fps to ${out} (tour runs ${slow}x slower, about ${Math.round((115 * slow) / 60)} min) ...`);
  const deadline = Date.now() + 30 * 60 * 1000;
  while (!(await page.evaluate(() => document.documentElement.dataset.tourFinished === 'true'))) {
    if (Date.now() > deadline) throw new Error('Tour did not finish within 30 minutes');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await new Promise((resolve) => setTimeout(resolve, 2000 * slow));
  await client.send('Page.stopScreencast');
  if (lastFrame && started !== null) {
    // Frames only arrive when the page changes, so pad the still ending up to the stop time.
    const due = Math.round(((Date.now() / 1000 - started) / slow) * FPS) - written;
    write(lastFrame, Math.max(due, 1));
  }
} catch (error) {
  console.error(`Recording failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  ffmpeg.stdin.end();
}

await new Promise((resolve) => ffmpeg.on('close', resolve));
console.log(`Done: ${out}`);
