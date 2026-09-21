/**
 * Surface scheme: the four adjustable surfaces (sidebar, settings panel,
 * conversation background, composer card) driven from the settings tab.
 *
 * Colours ride the shipped theme tokens, written as inline custom properties on
 * `<html>` (inline wins over every stylesheet, ours included). Blur needs a real
 * element, so each part publishes `--aem-blur-<part>` and `skin.css` hangs the
 * `backdrop-filter` on a stable DOM anchor, gated by the `data-aem-surfaces`
 * attribute set here. Everything written is remembered so turning the scheme off
 * restores whatever the host had inline before us.
 */
import type { AemeathSettings } from '../settings-contract'

export type SurfaceKey = 'sidebar' | 'panel' | 'chat' | 'input'

export interface SurfacePart {
  readonly color: string
  readonly opacity: number
  readonly blur: number
}

export interface SurfaceScheme {
  readonly enabled: boolean
  readonly parts: Readonly<Record<SurfaceKey, SurfacePart>>
}

/** Parts in the order the settings tab lists them. */
export const SURFACE_KEYS = ['sidebar', 'panel', 'chat', 'input'] as const satisfies readonly SurfaceKey[]

/** Attribute that arms the blur rules in `skin.css`. */
export const SURFACE_ATTR = 'data-aem-surfaces'

/**
 * Shipped tokens each part drives. The grouping follows how the theme consumes
 * them: the settings shell and cards read the layer tokens, the sidebar and the
 * composer card own a dedicated token each.
 */
const PART_TOKENS: Record<SurfaceKey, readonly string[]> = {
  sidebar: ['--dsw-specific-sidebar-fill'],
  panel: ['--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2', '--dsw-alias-bg-layer-3', '--dsw-specific-menu'],
  chat: ['--dsw-alias-bg-base'],
  input: ['--dsw-specific-input-major'],
}

export const DEFAULT_PART: SurfacePart = { color: '#ffffff', opacity: 1, blur: 0 }

/** Bounds the settings rows offer and the applier enforces. */
export const BLUR_MAX = 60

/** Inline values this applier replaced, keyed by property name. */
const replaced = new Map<string, string>()

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/** Parse `#rgb` / `#rrggbb`; null when the text is not a colour we accept. */
export function parseHex(value: string): readonly [number, number, number] | null {
  const text = value.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]+$/.test(text)) return null
  const expand = text.length === 3 ? text.replace(/./g, (digit) => digit + digit) : text
  if (expand.length !== 6) return null
  return [
    Number.parseInt(expand.slice(0, 2), 16),
    Number.parseInt(expand.slice(2, 4), 16),
    Number.parseInt(expand.slice(4, 6), 16),
  ]
}

function readPart(color: unknown, opacity: unknown, blur: unknown, fallback: SurfacePart): SurfacePart {
  const rgb = typeof color === 'string' ? parseHex(color) : null
  return {
    color: rgb === null ? fallback.color : color as string,
    opacity: typeof opacity === 'number' && Number.isFinite(opacity) ? clamp(opacity, 0, 1) : fallback.opacity,
    blur: typeof blur === 'number' && Number.isFinite(blur) ? clamp(blur, 0, BLUR_MAX) : fallback.blur,
  }
}

/** Read the scheme out of a settings section, falling back per field. */
export function readScheme(settings: AemeathSettings | undefined): SurfaceScheme {
  return {
    enabled: settings?.surfaceScheme !== false,
    parts: {
      sidebar: readPart(settings?.sidebarColor, settings?.sidebarOpacity, settings?.sidebarBlur, DEFAULT_PART),
      panel: readPart(settings?.panelColor, settings?.panelOpacity, settings?.panelBlur, DEFAULT_PART),
      chat: readPart(settings?.chatColor, settings?.chatOpacity, settings?.chatBlur, DEFAULT_PART),
      input: readPart(settings?.inputColor, settings?.inputOpacity, settings?.inputBlur, DEFAULT_PART),
    },
  }
}

/** `#a1b2c3` + 0.6 → `rgba(161, 178, 195, 0.6)`; opaque colours stay `rgb()`. */
export function toCssColor(part: SurfacePart): string {
  const rgb = parseHex(part.color) ?? parseHex(DEFAULT_PART.color) ?? [255, 255, 255]
  const alpha = clamp(part.opacity, 0, 1)
  const channels = `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`
  return alpha >= 1 ? `rgb(${channels})` : `rgba(${channels}, ${alpha})`
}

function writeVar(name: string, value: string): void {
  const root = document.documentElement
  if (!replaced.has(name)) replaced.set(name, root.style.getPropertyValue(name))
  root.style.setProperty(name, value)
}

/** Publish one scheme; a disabled scheme restores the previous inline state. */
export function applyScheme(scheme: SurfaceScheme): void {
  if (typeof document === 'undefined') return
  if (!scheme.enabled) {
    clearSurfaces()
    return
  }
  for (const key of SURFACE_KEYS) {
    const part = scheme.parts[key]
    const color = toCssColor(part)
    for (const token of PART_TOKENS[key]) writeVar(token, color)
    // `none` rather than `blur(0px)`: a no-op filter would still create a
    // containing block, which traps fixed-position menus inside the surface.
    const blur = clamp(part.blur, 0, BLUR_MAX)
    writeVar(`--aem-blur-${key}`, blur > 0 ? `blur(${blur}px)` : 'none')
  }
  document.documentElement.setAttribute(SURFACE_ATTR, '')
}

/** Restore every property this applier touched and disarm the blur rules. */
export function clearSurfaces(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [name, previous] of replaced) {
    if (previous === '') root.style.removeProperty(name)
    else root.style.setProperty(name, previous)
  }
  replaced.clear()
  root.removeAttribute(SURFACE_ATTR)
}
