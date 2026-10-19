/**
 * Writes the Markdown versions of the pages, `llms.txt` and `llms-full.txt` into the built site
 * (`src/mdx/markdown.ts`). Runs after `vite build`.
 */
import { mkdir, writeFile } from "node:fs/promises"
import { llmsFullTxt, llmsTxt, pageMarkdown } from "../src/mdx/markdown.ts"
import { pages } from "../src/pages.ts"

const out = new URL("../dist/client/", import.meta.url)
await mkdir(new URL("docs/", out), { recursive: true })

for (const page of pages) {
  await writeFile(
    new URL(`docs/${page.slug}.md`, out),
    await pageMarkdown(page)
  )
}
await writeFile(new URL("llms.txt", out), llmsTxt())
await writeFile(new URL("llms-full.txt", out), await llmsFullTxt())

console.log(`Wrote ${pages.length} Markdown pages, llms.txt and llms-full.txt`)
