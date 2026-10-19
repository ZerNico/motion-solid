import type { Options } from "@mdx-js/rollup"
import rehypeShiki from "@shikijs/rehype"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"
import { recmaSolidComponents } from "./recma-solid-components.ts"
import { themes } from "./highlight.ts"
import { remarkToc } from "./remark-toc.ts"

export const mdxOptions: Options = {
    // Keep the JSX for Solid's compiler instead of emitting React's runtime calls.
    jsx: true,
    jsxImportSource: "@solidjs/web",
    remarkPlugins: [remarkGfm, remarkToc],
    rehypePlugins: [rehypeSlug, [rehypeShiki, { themes, defaultColor: false }]],
    recmaPlugins: [recmaSolidComponents],
}
