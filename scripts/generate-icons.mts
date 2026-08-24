/**
 * Renders the app icons used by the web manifest, so an installed Betapet gets a home-screen icon
 * that looks like the game's own tiles rather than a browser default.
 *
 * Run with: npx tsx scripts/generate-icons.mts
 *
 * The tile is drawn at 62% of the canvas and centred, which keeps it inside the safe area a
 * maskable icon has to respect — Android crops such an icon to whatever shape the launcher uses,
 * and anything in the outer 20% can be cut away.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.join(process.cwd(), "public");

/** The tile palette from globals.css, so the icon and the game cannot drift apart unnoticed. */
const BACKGROUND = "#fffefb";
const TILE_BACKGROUND = "#fdf6e3";
const TILE_BORDER = "#c9b98f";
const TILE_FOREGROUND = "#3a2f1c";

function iconMarkup(size: number): string {
  const tile = Math.round(size * 0.62);
  return `<!doctype html>
<html>
  <body style="margin:0">
    <div style="
      width:${size}px; height:${size}px; background:${BACKGROUND};
      display:flex; align-items:center; justify-content:center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="
        position:relative;
        width:${tile}px; height:${tile}px;
        background:linear-gradient(155deg, ${TILE_BACKGROUND}, ${TILE_BORDER}22);
        border:${Math.max(2, Math.round(size * 0.012))}px solid ${TILE_BORDER};
        border-radius:${Math.round(size * 0.09)}px;
        display:flex; align-items:center; justify-content:center;
        color:${TILE_FOREGROUND};
      ">
        <span style="font-size:${Math.round(tile * 0.62)}px; font-weight:700; line-height:1">B</span>
        <span style="
          position:absolute; right:${Math.round(tile * 0.1)}px; bottom:${Math.round(tile * 0.06)}px;
          font-size:${Math.round(tile * 0.2)}px; font-weight:400; line-height:1;
        ">3</span>
      </div>
    </div>
  </body>
</html>`;
}

const browser = await chromium.launch();
try {
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const size of [192, 512]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(iconMarkup(size));
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `icon-${size}.png`),
      omitBackground: false,
    });
    await page.close();
    console.log(`wrote public/icon-${size}.png`);
  }
} finally {
  await browser.close();
}
