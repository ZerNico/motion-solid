/**
 * Compiles every page with the site's MDX options, to catch syntax errors without a build. Run
 * with `pnpm check:mdx`.
 */
import { compile } from "@mdx-js/mdx"
import { readdir, readFile } from "node:fs/promises"
import { mdxOptions } from "../src/mdx/options.ts"

const content = new URL("../src/content/", import.meta.url)
let failed = 0
for (const file of await readdir(content)) {
    if (!file.endsWith(".mdx")) continue
    try {
        await compile(
            await readFile(new URL(file, content), "utf8"),
            mdxOptions
        )
    } catch (error) {
        failed++
        console.error(`${file}: ${error}`)
    }
}
if (failed) process.exit(1)
console.log("All pages compile.")
