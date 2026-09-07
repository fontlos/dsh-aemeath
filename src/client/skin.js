// Skin: wallpaper background + palette. The stylesheet is served by the host
// at /dsh-aemeath/skin.css and injected as <link>, so style edits never need
// a bundle rebuild.

const CSS_KEY = 'dsh-aemeath/skin.css'
const CSS_HREF = '/dsh-aemeath/skin.css'

function mount(ctx) {
    if (typeof document === 'undefined') return
    if (document.querySelector('link[data-plugin-css=' + JSON.stringify(CSS_KEY) + ']')) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = CSS_HREF
    link.dataset.plugin = 'dsh-aemeath'
    link.dataset.pluginCss = CSS_KEY
    document.head.appendChild(link)
    ctx.effect(() => () => link.remove(), 'dsh-aemeath: skin css cleanup')
}

export { mount }
