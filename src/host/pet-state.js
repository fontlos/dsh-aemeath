/**
 * Pet state machine (host): folds agent events into a tiny
 * { animation, bubble, core } state served to the client pet at /dsh-aemeath/status.
 */

/** Tool name → [animation track, bubble text]. Mirrors the aemeath pet hook states. */
const TOOL_STATES = {
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

function createMachine() {
    const state = { animation: 'idle', bubble: '', core: 'idle' }
    let busyCount = 0
    let agentRunning = false
    let celebratingTimer = null

    function setState(patch) {
        Object.assign(state, patch)
    }
    function clearCelebrating() {
        if (celebratingTimer) {
            clearTimeout(celebratingTimer)
            celebratingTimer = null
        }
    }
    function scheduleCelebratingEnd() {
        clearCelebrating()
        celebratingTimer = setTimeout(() => {
            celebratingTimer = null
            if (agentRunning) setState({ animation: 'chatting', bubble: '继续努力中~', core: 'chatting' })
            else setState({ animation: 'idle', bubble: '', core: 'idle' })
        }, 1600)
    }

    function onInboxInserted() {
        clearCelebrating()
        setState({ animation: 'chatting', bubble: '正在组织回复...', core: 'chatting' })
    }
    function onAgentStatus(payload) {
        const status = payload && payload.status
        if (status === 'running') {
            agentRunning = true
        } else if (status === 'idle') {
            agentRunning = false
            if (busyCount <= 0) {
                clearCelebrating()
                setState({ animation: 'idle', bubble: '', core: 'idle' })
            }
        }
    }
    async function onToolPreExecute(exec, next) {
        try {
            const name = exec && exec.name
            if (typeof name === 'string') {
                const m = TOOL_STATES[name] || ['running', '工作中...']
                busyCount += 1
                clearCelebrating()
                setState({ animation: m[0], bubble: m[1], core: 'running' })
            }
        } catch (_) { /* never break the tool pipeline */ }
        return next()
    }
    function onToolResult() {
        if (busyCount > 0) busyCount -= 1
        if (busyCount > 0) return
        clearCelebrating()
        setState({ animation: 'celebrating', bubble: '太棒了!', core: 'ready' })
        scheduleCelebratingEnd()
    }

    return {
        state,
        onInboxInserted,
        onAgentStatus,
        onToolPreExecute,
        onToolResult,
    }
}

function registerStatusRoute(ctx, machine) {
    const webServer = ctx.webServer
    ctx.effect(
        () => webServer.register({
            kind: 'exact',
            path: '/dsh-aemeath/status',
            handler: (req, res) => {
                if (req.method !== 'GET') {
                    res.writeHead(405)
                    res.end()
                    return
                }
                res.writeHead(200, {
                    'content-type': 'application/json; charset=utf-8',
                    'cache-control': 'no-cache',
                })
                res.end(JSON.stringify({
                    animation: machine.state.animation,
                    bubble: machine.state.bubble,
                    core: machine.state.core,
                }))
            },
        }),
        'dsh-aemeath: status route',
    )
}

/** Register the pet state machine + its status route on a plugin context. */
export function registerPetState(ctx) {
    const machine = createMachine()
    ctx.on('agent/inbox/inserted', machine.onInboxInserted)
    ctx.on('agent/status', machine.onAgentStatus)
    ctx.on('tools/pre-execute', machine.onToolPreExecute)
    ctx.on('tools/result', machine.onToolResult)
    registerStatusRoute(ctx, machine)
}
