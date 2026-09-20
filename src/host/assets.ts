import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'

/**
 * Serves /dsh-aemeath/* — wallpaper, spritesheet and the three feature
 * stylesheets — from `assets/` next to the built entry. Kept separate from the
 * client bundle so style/art edits never require a rebuild.
 */
const ASSET_DIR = fileURLToPath(new URL('../assets/', import.meta.url))

interface AssetRoute {
  readonly path: string
  readonly file: string
  readonly mime: string
}

const ROUTES = [
  { path: '/dsh-aemeath/wallpaper.jpg', file: 'wallpaper.jpg', mime: 'image/jpeg' },
  { path: '/dsh-aemeath/spritesheet.webp', file: 'spritesheet.webp', mime: 'image/webp' },
  { path: '/dsh-aemeath/skin.css', file: 'css/skin.css', mime: 'text/css; charset=utf-8' },
  { path: '/dsh-aemeath/pet.css', file: 'css/pet.css', mime: 'text/css; charset=utf-8' },
  { path: '/dsh-aemeath/effort.css', file: 'css/effort.css', mime: 'text/css; charset=utf-8' },
] as const satisfies readonly AssetRoute[]

/**
 * Last served revision of each asset: the bytes plus the mtime they came from.
 * The payload is re-read when the file's mtime moves, so a style or art edit is
 * picked up by the next request instead of needing a plugin restart.
 */
const cache = new Map<string, { readonly mtimeMs: number; readonly bytes: Buffer } | null>()

async function loadAsset(file: string): Promise<Buffer | null> {
  try {
    const info = await stat(join(ASSET_DIR, file))
    const cached = cache.get(file)
    if (cached && cached.mtimeMs === info.mtimeMs) return cached.bytes
    const bytes = await readFile(join(ASSET_DIR, file))
    cache.set(file, { mtimeMs: info.mtimeMs, bytes })
    return bytes
  } catch (error) {
    console.error('[dsh-aemeath] asset load failed:', file, error)
    cache.set(file, null)
    return null
  }
}

function serveAsset(file: string, mime: string): WebRoute['handler'] {
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405)
      res.end()
      return
    }
    const body = await loadAsset(file)
    if (body === null) {
      res.writeHead(404)
      res.end('dsh-aemeath asset not found')
      return
    }
    res.writeHead(200, {
      'content-type': mime,
      'content-length': String(body.byteLength),
      'cache-control': 'no-cache',
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    res.end(body)
  }
}

/** Register every asset and stylesheet route. */
export function registerAssets(ctx: Context): void {
  for (const { path, file, mime } of ROUTES) {
    ctx.effect(
      () => ctx.webServer.register({ kind: 'exact', path, handler: serveAsset(file, mime) }),
      `dsh-aemeath: ${path} route`,
    )
  }
}
