import mdx from "@mdx-js/rollup"
import solid from "@solidjs/vite-plugin"
import tailwind from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/solid-start/plugin/vite"
import { defineConfig } from "vite"
import { mdxOptions } from "./src/mdx/options.ts"
import { sourcePlugin } from "./src/mdx/source-plugin.ts"

export default defineConfig({
  preview: { host: "127.0.0.1" },
  // The docs and the library must share Solid's runtime (owners, context).
  resolve: { dedupe: ["solid-js", "@solidjs/web"] },
  // The library is consumed from source, so the server build compiles it too.
  ssr: { noExternal: ["solid-js", "@solidjs/web", "@motion-s/solid"] },
  plugins: [
    sourcePlugin(),
    { ...mdx(mdxOptions), enforce: "pre" },
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: true,
        // `page.html` rather than `page/index.html`, so static hosts serve `/page`
        // without redirecting to `/page/`.
        autoSubfolderIndex: false,
      },
    }),
    solid({ ssr: true, extensions: [".mdx"] }),
    tailwind(),
  ],
})
