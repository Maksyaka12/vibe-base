import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const THEMES_DIR = path.resolve(__dirname, 'src/themes')

function inlineCss() {
  return {
    name: 'inline-css-plugin',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx || !ctx.bundle) return html;
        const tags = [];
        for (const [fileName, file] of Object.entries(ctx.bundle)) {
          if (fileName.endsWith('.css') && file.type === 'asset' && file.source) {
            tags.push({
              tag: 'style',
              attrs: { 'data-inlined-css': fileName },
              children: typeof file.source === 'string' ? file.source : file.source.toString(),
              injectTo: 'head',
            });
          }
        }
        return tags;
      },
    },
  };
}

// Both themes ship in one stylesheet, so every rule from src/themes/<theme>/**.css
// is scoped to <html data-theme="<theme>">. :where() keeps the original specificity,
// and keyframes get a theme suffix so same-named animations don't override each other.
function collectKeyframes(dir) {
  const names = new Set()
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name)
    if (e.isDirectory()) return walk(p)
    if (p.endsWith('.css')) {
      for (const m of fs.readFileSync(p, 'utf8').matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)) names.add(m[1])
    }
  })
  if (fs.existsSync(dir)) walk(dir)
  return names
}

function themeScope() {
  const keyframesByTheme = {}
  return {
    postcssPlugin: 'theme-scope',
    Once(root) {
      const file = root.source?.input?.file
      if (!file) return
      const rel = path.relative(THEMES_DIR, file)
      if (rel.startsWith('..') || path.isAbsolute(rel)) return
      const theme = rel.split(path.sep)[0]
      const keyframes = keyframesByTheme[theme] ||= collectKeyframes(path.join(THEMES_DIR, theme))
      const scope = `:where(html[data-theme="${theme}"])`
      const rename = name => `${name}--${theme}`

      root.walkAtRules(/keyframes$/, at => { if (keyframes.has(at.params)) at.params = rename(at.params) })
      root.walkDecls(/^(-webkit-)?animation(-name)?$/, decl => {
        decl.value = decl.value.replace(/[\w-]+/g, word => (keyframes.has(word) ? rename(word) : word))
      })
      root.walkRules(rule => {
        if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return
        rule.selectors = rule.selectors.flatMap(sel => {
          const s = sel.trim()
          const root = s.match(/^(html|:root)(?![\w-])/)
          if (root) return [`${root[1]}:where([data-theme="${theme}"])${s.slice(root[1].length)}`]
          if (s.startsWith('::')) return [`${scope}${s}`, `${scope} ${s}`]
          if (s === '*') return [scope, `${scope} *`]
          return [`${scope} ${s}`]
        })
      })
    },
  }
}
themeScope.postcss = true

// Serves /api/schedule during `npm run dev` with the same handler as the Vercel function.
function scheduleApiDev() {
  return {
    name: 'schedule-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/schedule', async (req, res) => {
        const { handleSchedule } = await server.ssrLoadModule('/api/_lib/schedule.js')
        let body
        if (req.method === 'PUT') {
          let raw = ''
          for await (const chunk of req) raw += chunk
          try { body = JSON.parse(raw) } catch { body = null }
        }
        const query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
        const result = await handleSchedule({ method: req.method, query, body })
        res.statusCode = result.status
        for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v)
        res.end(JSON.stringify(result.body))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), inlineCss(), scheduleApiDev()],
  css: {
    postcss: { plugins: [themeScope()] },
  },
  build: {
    // One stylesheet for both themes (scoped above) so the inlined CSS covers whichever theme loads.
    cssCodeSplit: false,
  },
})
