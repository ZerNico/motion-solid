import { readFile } from "node:fs/promises"
import type { Plugin } from "vite"
import { highlight } from "./highlight.ts"

const QUERY = "?source"
const PREFIX = "\0docs-source:"

/**
 * `import source from "./Demo.tsx?source"`: the file's source, highlighted at build time, as
 * `{ code, html }`.
 */
export function sourcePlugin(): Plugin {
  return {
    name: "docs-source",
    enforce: "pre",
    async resolveId(id, importer) {
      if (!id.endsWith(QUERY)) return
      const resolved = await this.resolve(
        id.slice(0, -QUERY.length),
        importer,
        { skipSelf: true }
      )
      if (resolved) return PREFIX + resolved.id
    },
    async load(id) {
      if (!id.startsWith(PREFIX)) return
      const file = id.slice(PREFIX.length)
      this.addWatchFile(file)
      const code = (await readFile(file, "utf8")).trimEnd()
      const html = await highlight(code, file.split(".").at(-1)!)
      return `export default ${JSON.stringify({ code, html })}`
    },
  }
}
