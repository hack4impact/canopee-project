import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'assets')

const FOREST = '#004523'
const CREAM = '#f6f4df'
const TRANSPARENT = '#00000000'

const WORDMARK = path.join(
  ROOT,
  'public',
  'logos',
  'Logo_horizontal_vertforet.png',
)
const MARK_REGION = { left: 1863, top: 77, width: 1095, height: 782 }
const LOCKUP = path.join(
  ROOT,
  'public',
  'logos',
  'Logo_verticalslogan_beige-10.png',
)

const ICON_SIZE = 1024
const SPLASH_SIZE = 2732
const ICON_SCALE = 0.62
const ADAPTIVE_SCALE = 0.62
const LOCKUP_SCALE = 0.35

async function dimensions(file: string) {
  const { width, height } = await sharp(file).metadata()

  if (!width || !height) {
    throw new Error(`Could not read the dimensions of ${file}`)
  }

  return { width, height }
}

async function tinted(
  shape: Buffer,
  width: number,
  height: number,
  color: string,
) {
  const layer = await sharp({
    create: { width, height, channels: 4, background: color },
  })
    .png()
    .toBuffer()

  return sharp(layer)
    .composite([{ input: shape, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function mark(width: number, color: string) {
  const height = Math.round((MARK_REGION.height / MARK_REGION.width) * width)
  const shape = await sharp(WORDMARK)
    .extract(MARK_REGION)
    .resize(width, height)
    .png()
    .toBuffer()

  return tinted(shape, width, height, color)
}

async function lockup(height: number, color: string) {
  const source = await dimensions(LOCKUP)
  const width = Math.round((source.width / source.height) * height)
  const shape = await sharp(LOCKUP).resize(width, height).png().toBuffer()

  return tinted(shape, width, height, color)
}

function solid(size: number, color: string) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: color },
  })
    .png()
    .toBuffer()
}

async function canvas(size: number, color: string, layer: Buffer) {
  return sharp(await solid(size, color))
    .composite([{ input: layer, gravity: 'center' }])
    .png()
    .toBuffer()
}

function write(name: string, image: Buffer) {
  fs.writeFileSync(path.join(OUT, name), image)
  console.log('wrote', path.join('assets', name))
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })

  write(
    'icon-only.png',
    await canvas(
      ICON_SIZE,
      CREAM,
      await mark(Math.round(ICON_SIZE * ICON_SCALE), FOREST),
    ),
  )
  write(
    'icon-foreground.png',
    await canvas(
      ICON_SIZE,
      TRANSPARENT,
      await mark(Math.round(ICON_SIZE * ADAPTIVE_SCALE), FOREST),
    ),
  )
  write('icon-background.png', await solid(ICON_SIZE, CREAM))
  write(
    'splash.png',
    await canvas(
      SPLASH_SIZE,
      CREAM,
      await lockup(Math.round(SPLASH_SIZE * LOCKUP_SCALE), FOREST),
    ),
  )
  write(
    'splash-dark.png',
    await canvas(
      SPLASH_SIZE,
      FOREST,
      await lockup(Math.round(SPLASH_SIZE * LOCKUP_SCALE), CREAM),
    ),
  )
}

main()
