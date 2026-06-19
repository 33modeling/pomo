// Generates Android launcher icons (legacy + round + adaptive foreground) for
// the Capacitor project from the Pomo logo mark. Run: node scripts/gen-android-icons.mjs
// (requires sharp:  npm install --no-save sharp)
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const resDir = join(root, 'android', 'app', 'src', 'main', 'res')

const BG = '#E8442F' // adaptive background color (tomato)

const GRAD = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff7d6e"/>
      <stop offset="1" stop-color="#e8442f"/>
    </linearGradient>
  </defs>`

function ring(cx, cy, r, sw) {
  const C = 2 * Math.PI * r
  const arc = C * 0.72
  const gap = C - arc
  return `<g transform="rotate(125 ${cx} ${cy})">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ffffff"
      stroke-opacity="0.96" stroke-width="${sw}" stroke-linecap="round"
      stroke-dasharray="${arc} ${gap}"/>
  </g>`
}

// Legacy square icon (rounded), 512 canvas.
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${GRAD}<rect width="512" height="512" rx="116" fill="url(#g)"/>${ring(256, 256, 118, 30)}</svg>`

// Legacy round icon, 512 canvas.
const circle = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${GRAD}<circle cx="256" cy="256" r="256" fill="url(#g)"/>${ring(256, 256, 118, 30)}</svg>`

// Adaptive foreground: white ring on transparent, kept inside the 66% safe zone
// of a full-bleed 432 canvas.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 432 432">
  ${ring(216, 216, 108, 30)}</svg>`

const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const FORE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }

async function png(svg, size, dir, file) {
  const out = join(resDir, dir)
  mkdirSync(out, { recursive: true })
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(out, file))
}

for (const [d, size] of Object.entries(LEGACY)) {
  await png(rounded, size, `mipmap-${d}`, 'ic_launcher.png')
  await png(circle, size, `mipmap-${d}`, 'ic_launcher_round.png')
}
for (const [d, size] of Object.entries(FORE)) {
  await png(foreground, size, `mipmap-${d}`, 'ic_launcher_foreground.png')
}

// Adaptive background color.
mkdirSync(join(resDir, 'values'), { recursive: true })
writeFileSync(
  join(resDir, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG}</color>
</resources>
`,
)

console.log('Android launcher icons generated.')
