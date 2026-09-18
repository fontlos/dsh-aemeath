/**
 * Event contracts this plugin consumes, mirrored from the packages that own
 * them (`@deepseek-ai/dsh-agent` for `agent/*`, `@deepseek-ai/dsh-tools` for
 * `tools/*`). Declared here instead of depending on the whole host agent stack
 * just for two event shapes; keep them in sync when those change.
 *
 * `export {}` keeps this file a module, so the block below is a module
 * augmentation rather than an ambient module declaration (which would shadow
 * the real package types).
 */
import type {} from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Events {
    /** A message was inserted into the agent inbox. */
    'agent/inbox/inserted'(): void
    /** Agent run state changed. */
    'agent/status'(payload: { status?: 'running' | 'idle' }): void
    /** Waterfall before a tool executes; call `next()` to continue the chain. */
    'tools/pre-execute'(exec: { name?: string }, next: () => unknown): unknown
    /** A tool finished (success or failure). */
    'tools/result'(): void
  }
}

export {}
