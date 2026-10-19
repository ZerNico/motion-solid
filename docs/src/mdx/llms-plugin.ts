import type { Plugin } from "vite"
import { pages } from "../pages.ts"
import { llmsFullTxt, llmsTxt, pageMarkdown } from "./markdown.ts"

/**
 * The Markdown files of `markdown.ts`: served by the dev server, and written next to the
 * prerendered pages by `scripts/llms.ts` after a build.
 */
export function llmsPlugin(): Plugin {
  return {
    name: "docs:llms",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0]
        let body: string | undefined
        let type = "text/plain"
        if (path === "/llms.txt") body = llmsTxt()
        else if (path === "/llms-full.txt") body = await llmsFullTxt()
        else {
          const slug = path?.match(/^\/docs\/(.+)\.md$/)?.[1]
          const page = pages.find((page) => page.slug === slug)
          if (page) {
            body = await pageMarkdown(page)
            type = "text/markdown"
          }
        }
        if (body === undefined) return next()
        res.setHeader("Content-Type", `${type}; charset=utf-8`)
        res.end(body)
      })
    },
  }
}
