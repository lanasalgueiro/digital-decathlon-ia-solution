const fs = require('fs')
const path = require('path')

const htmlPath = path.join(__dirname, 'dist-embed', 'index.html')
const outPath = path.join(__dirname, '..', 'ops-hub', 'react', 'opsHubHtml.js')
const html = fs.readFileSync(htmlPath, 'utf8')

const rootAt = html.indexOf('id="root"')
const scriptAt = html.indexOf('<script>')

console.log({
  rootAt,
  scriptAt,
  rootBeforeScript: rootAt !== -1 && scriptAt !== -1 && rootAt < scriptAt,
  hasModule: /type=["']module["']/.test(html),
  bytes: html.length,
})

if (rootAt === -1 || scriptAt === -1 || rootAt >= scriptAt) {
  process.exitCode = 1
  console.error('FAIL: #root must appear before <script>')
} else {
  fs.writeFileSync(outPath, `export default ${JSON.stringify(html)}\n`)
  console.log('wrote', outPath)
}
