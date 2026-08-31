import type { MarkdownRenderEnv } from '../build/markdown-plugins'
import fs from 'node:fs/promises'
import ansis from 'ansis'
import fg from 'fast-glob'
import matter from 'gray-matter'
import { createMarkdownExit } from 'markdown-exit'
import { parse } from 'vue/compiler-sfc'
import { formatMarkdownDiagnostic, registerCustomPlugins } from '../build/markdown-plugins'

async function run() {
  const files = await fg('pages/**/*.md')
  let hasErrors = false

  const md = createMarkdownExit({ html: true })
  registerCustomPlugins(md, new Map())

  console.log(ansis.blue(`Checking ${files.length} markdown files for HTML validity...`))

  for (const file of files) {
    const rawContent = await fs.readFile(file, 'utf-8')

    // Strip frontmatter to prevent vue/compiler-sfc syntax errors
    const { content } = matter(rawContent)

    const env: MarkdownRenderEnv = {
      id: file,
      markdownDiagnostics: [],
      path: file,
      reportMarkdownDiagnostics: false,
    }
    const html = md.render(content, env)
    const parsed = parse(`<template>\n${html}\n</template>`, { filename: file })

    if (env.markdownDiagnostics && env.markdownDiagnostics.length > 0) {
      hasErrors = true
      console.log(ansis.red(`\n❌ Markdown syntax issue in: ${file}`))
      for (const diagnostic of env.markdownDiagnostics)
        console.log(ansis.yellow(`  ${formatMarkdownDiagnostic(diagnostic, file)}`))
    }

    if (parsed.errors && parsed.errors.length > 0) {
      hasErrors = true
      console.log(ansis.red(`\n❌ Error in: ${file}`))

      const htmlLines = `<template>\n${html}\n</template>`.split('\n')

      for (const err of parsed.errors) {
        const loc = 'loc' in err ? err.loc : undefined
        if (!loc) {
          console.log(ansis.red(`  ${err.message}`))
          continue
        }

        const line = loc.start.line
        const column = loc.start.column

        console.log(ansis.yellow(`  ${err.message} (Generated HTML line: ${line}, col: ${column})`))
        console.log(ansis.dim('  --- Context ---'))
        for (let i = Math.max(0, line - 3); i < Math.min(htmlLines.length, line + 2); i++) {
          const prefix = i === line - 1 ? ansis.red('  > ') : '    '
          console.log(`${prefix}${htmlLines[i]}`)
        }
        console.log(ansis.dim('  ----------------\n'))
      }
    }
  }

  if (hasErrors) {
    console.log(ansis.red.bold('\nHTML parsing errors found in markdown files! 👆\n'))
    process.exit(1)
  }
  else {
    console.log(ansis.green.bold('✅ All markdown files are valid!'))
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
