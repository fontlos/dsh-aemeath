import type { Context } from '@deepseek-ai/cordis'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'

/**
 * Pet state machine: folds agent lifecycle events into the tiny
 * `{ animation, bubble, core }` state the client pet polls at
 * /dsh-aemeath/status.
 */
type Animation =
  | 'idle'
  | 'running'
  | 'building'
  | 'analyzing'
  | 'fetching'
  | 'searching'
  | 'waving'
  | 'waiting'
  | 'review'
  | 'chatting'
  | 'celebrating'
type Core = 'idle' | 'running' | 'chatting' | 'ready' | 'waiting'

interface PetState {
  animation: Animation
  bubble: string
  core: Core
}

/** Tool name → animation track + bubble line. */
const TOOL_STATES: Readonly<Record<string, readonly [Animation, string]>> = {
  read: ['running', '正在读取文件...'],
  grep: ['running', '正在搜索代码...'],
  glob: ['running', '正在查找文件...'],
  write: ['building', '正在构建...'],
  edit: ['building', '正在修改文件...'],
  bash: ['running', '正在执行命令...'],
  pwsh: ['running', '正在执行命令...'],
  subagent: ['analyzing', '正在分析...'],
  workflow: ['analyzing', '正在编排任务...'],
  web_fetch: ['fetching', '正在获取网络内容...'],
  web_search: ['searching', '正在搜索网络...'],
  ask_user_question: ['waving', '等待你的指示...'],
  todo_write: ['waiting', '整理任务清单...'],
  skill: ['review', '学习中...'],
}
const UNKNOWN_TOOL: readonly [Animation, string] = ['running', '工作中...']

function createMachine() {
  const state: PetState = { animation: 'idle', bubble: '', core: 'idle' }
  let busyCount = 0
  let agentRunning = false
  let celebratingTimer: ReturnType<typeof setTimeout> | null = null

  function patch(next: Partial<PetState>): void {
    Object.assign(state, next)
  }
  function clearCelebrating(): void {
    if (celebratingTimer !== null) {
      clearTimeout(celebratingTimer)
      celebratingTimer = null
    }
  }
  function scheduleCelebratingEnd(): void {
    clearCelebrating()
    celebratingTimer = setTimeout(() => {
      celebratingTimer = null
      patch(
        agentRunning
          ? { animation: 'chatting', bubble: '继续努力中~', core: 'chatting' }
          : { animation: 'idle', bubble: '', core: 'idle' },
      )
    }, 1600)
  }

  return {
    state,
    onInboxInserted(): void {
      clearCelebrating()
      patch({ animation: 'chatting', bubble: '正在组织回复...', core: 'chatting' })
    },
    onAgentStatus(payload: { status?: 'running' | 'idle' }): void {
      if (payload.status === 'running') {
        agentRunning = true
        return
      }
      if (payload.status !== 'idle') return
      agentRunning = false
      if (busyCount > 0) return
      clearCelebrating()
      patch({ animation: 'idle', bubble: '', core: 'idle' })
    },
    async onToolPreExecute(exec: { name?: string }, next: () => unknown): Promise<unknown> {
      try {
        const name = exec.name
        if (typeof name === 'string') {
          const [animation, bubble] = TOOL_STATES[name] ?? UNKNOWN_TOOL
          busyCount += 1
          clearCelebrating()
          patch({ animation, bubble, core: 'running' })
        }
      } catch {
        /* never break the tool pipeline */
      }
      return next()
    },
    onToolResult(): void {
      if (busyCount > 0) busyCount -= 1
      if (busyCount > 0) return
      clearCelebrating()
      patch({ animation: 'celebrating', bubble: '太棒了!', core: 'ready' })
      scheduleCelebratingEnd()
    },
  }
}

export function registerPetState(ctx: Context): void {
  const machine = createMachine()
  ctx.on('agent/inbox/inserted', machine.onInboxInserted)
  ctx.on('agent/status', machine.onAgentStatus)
  ctx.on('tools/pre-execute', machine.onToolPreExecute)
  ctx.on('tools/result', machine.onToolResult)

  const handler: WebRoute['handler'] = (req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405)
      res.end()
      return
    }
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache',
    })
    res.end(JSON.stringify(machine.state))
  }
  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: '/dsh-aemeath/status', handler }),
    'dsh-aemeath: status route',
  )
}
