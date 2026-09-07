import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Host half: serves /dsh-aemeath/* wallpaper, spritesheet and stylesheets.
 * Depends only on the `webServer` service.
 */

/** Package root (assets/ lives two levels above this module). */
const ROOT = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = join(ROOT, '..', '..', 'assets')

const cache = new Map()

async function loadAsset(name) {
    if (cache.has(name)) return cache.get(name)
    try {
        const bytes = await readFile(join(ASSET_DIR, name))
        cache.set(name, bytes)
        return bytes
    } catch (err) {
        console.error('[dsh-aemeath] asset load failed', name, err)
        cache.set(name, null)
        return null
    }
}

function serveAsset(name, mime) {
    return async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405)
            res.end()
            return
        }
        const body = await loadAsset(name)
        if (!body) {
            res.writeHead(404)
            res.end('dsh-aemeath asset not found')
            return
        }
        res.writeHead(200, {
            'content-type': mime,
            'content-length': String(body.byteLength),
            'cache-control': 'public, max-age=3600',
        })
        if (req.method === 'HEAD') {
            res.end()
            return
        }
        res.end(body)
    }
}

/** Feature stylesheets under /dsh-aemeath/*.css (served so the client bundle
 * stays lean; the client injects them with <link> tags). */
const STYLE_ROUTES = [
    { path: '/dsh-aemeath/skin.css', file: 'css/skin.css', mime: 'text/css; charset=utf-8' },
    { path: '/dsh-aemeath/pet.css', file: 'css/pet.css', mime: 'text/css; charset=utf-8' },
    { path: '/dsh-aemeath/effort.css', file: 'css/effort.css', mime: 'text/css; charset=utf-8' },
]

/** Register asset + stylesheet routes on a context that provides `webServer`. */
export function registerAssets(ctx) {
    const webServer = ctx.webServer
    const routes = [
        ['/dsh-aemeath/wallpaper.jpg', 'wallpaper.jpg', 'image/jpeg'],
        ['/dsh-aemeath/spritesheet.webp', 'spritesheet.webp', 'image/webp'],
        ...STYLE_ROUTES.map((r) => [r.path, r.file, r.mime]),
    ]
    for (const [path, file, mime] of routes) {
        ctx.effect(
            () => webServer.register({
                kind: 'exact',
                path,
                handler: serveAsset(file, mime),
            }),
            `dsh-aemeath: ${path} route`,
        )
    }
}
