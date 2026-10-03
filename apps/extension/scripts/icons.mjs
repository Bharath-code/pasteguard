// Renders public/icon/{active,idle,paused}-{16,32,48,128}.png from a 16-unit grid so every size is an integer scale.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const SHIELD = 'M8 1 2 3.5v4c0 3.75 2.55 6.7 6 7.5 3.45-.8 6-3.75 6-7.5v-4L8 1Z'
const INNER = 'M8 2.2 3 4.3v3.2c0 3 2 5.5 5 6.3 3-.8 5-3.3 5-6.3V4.3L8 2.2Z'
const art = {
  active: `<path d="${SHIELD}" fill="#F2E15B"/><rect x="4" y="6" width="8" height="2" fill="#120D24"/><rect x="4" y="9" width="5" height="1" fill="#120D24" opacity=".5"/>`,
  idle: `<path d="${SHIELD}${INNER}" fill="#ADA6C4" fill-rule="evenodd"/><rect x="4" y="6" width="8" height="2" fill="#ADA6C4"/>`,
  paused: `<path d="${SHIELD}" fill="#3B3163"/><path d="M3.5 13 12.5 3" stroke="#ADA6C4" stroke-width="1.5" stroke-linecap="round"/>`,
}

mkdirSync(new URL('../public/icon/', import.meta.url), { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const [state, body] of Object.entries(art)) {
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">${body}</svg>`)
    await page.screenshot({ path: new URL(`../public/icon/${state}-${size}.png`, import.meta.url).pathname, omitBackground: true })
  }
}
await browser.close()
