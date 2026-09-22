/**
 * Client-side service faces this plugin consumes.
 *
 * The browser packages publish `Context` augmentations for the locale, settings,
 * session and model-directory services, so those are pulled in by importing
 * their client type entries (type-only imports below). The slot registry has no
 * published augmentation yet, so its narrow shape is declared here.
 */
import type {} from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { ComponentType } from 'react'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Frame-wide slot registry (`inject: ['slots']`). */
    readonly slots?: SlotRegistry
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /**
     * This plugin's dictionaries (`src/client/i18n.ts`).
     * The key domain is left as `string`: the namespace is registered in the
     * single bilingual `register(NS, { zh, en })` form, while the translate it
     * binds is handed to surfaces typed with the wide `Translate` face.
     */
    'dsh-aemeath': string
  }
}

/** Disposer returned by every registration below. */
export type Dispose = () => void

/** Options one slot occupant registers with. */
export interface SlotEntryOptions<Props> {
  /** Declared slot this occupant claims. */
  readonly name: string
  /** Stable occupant id (keyed slots) or list entry identity. */
  readonly id?: string
  /** Display order inside the slot. */
  readonly order?: number
  /** Election priority of a single-slot cell. */
  readonly priority?: number
  /** Slot label shown by host surfaces. */
  readonly label?: string | (() => string)
  /** Props this occupant receives (session-scoped cells get the session id). */
  readonly inject?: (...args: never[]) => Props
}

/** The frame-wide slot registry service. */
export interface SlotRegistry {
  /** Claim a slot; the returned disposer releases it. */
  register<Props>(options: SlotEntryOptions<Props>, component: ComponentType<Props>): Dispose
  /** Run `callback` once `name` is declared; the handle tears the wait down. */
  inject(name: string, callback: () => void): { dispose(): void }
}
