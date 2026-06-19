// One-time asset generator: renders the Pomo logo mark to PNG icons for the
// PWA manifest. Run with: npm install --no-save sharp && node scripts/gen-icons.mjs
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = join(root, 'public', 'icons')
mkdirSync(iconsDir, { recursive: true })

const GRAD = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff7d6e"/>
      <stop offset="1" stop-color="#e8442f"/>
    </linearGradient>
  </defs>`

function ring(r, sw) {
  const cx = 256
  const cy = 256
  const C = 2 * Math.PI * r
  const arc = C * 0.72
  const gap = C - arc
  return `<g transform="rotate(125 ${cx} ${cy})">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ffffff"
      stroke-opacity="0.96" stroke-width="${sw}" stroke-linecap="round"
      stroke-dasharray="${arc} ${gap}"/>
  </g>`
}

function rounded() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    ${GRAD}
    <rect x="0" y="0" width="512" height="512" rx="116" fill="url(#g)"/>
    ${ring(118, 30)}
  </svg>`
}

function maskable() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    ${GRAD}
    <rect x="0" y="0" width="512" height="512" fill="url(#g)"/>
    ${ring(96, 26)}
  </svg>`
}

async function png(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(iconsDir, file))
  console.log('wrote', file)
}

await png(rounded(), 192, 'icon-192.png')
await png(rounded(), 512, 'icon-512.png')
await png(maskable(), 512, 'maskable-512.png')
await png(rounded(), 180, 'apple-touch-icon.png')
writeFileSync(join(root, 'public', 'favicon.svg'), rounded().trim())
console.log('done')
