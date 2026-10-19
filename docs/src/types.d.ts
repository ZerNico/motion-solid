/// <reference types="vite/client" />

declare module "*.mdx" {
  import type { Component } from "solid-js"

  const MDXContent: Component<{ components?: Record<string, unknown> }>
  export const toc: import("./mdx/remark-toc").TocEntry[]
  export default MDXContent
}

declare module "*?source" {
  const source: { code: string; html: string }
  export default source
}
