/**
 * Opens pages of a running docs server in Chromium and reports errors: uncaught exceptions,
 * console errors and warnings, and failed requests. Run with
 * `pnpm check:pages [--base http://127.0.0.1:3006] [slug ...]` (every page without slugs).
 */
import { chromium } from "playwright"
import { pages } from "../src/pages.ts"

const args = process.argv.slice(2)
const baseIndex = args.indexOf("--base")
const base =
  baseIndex === -1 ? "http://127.0.0.1:3006" : args.splice(baseIndex, 2)[1]
const slugs = args.length ? args : pages.map((page) => page.slug)

const browser = await chromium.launch()
let failed = 0
for (const slug of slugs) {
  const page = await browser.newPage()
  const problems: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on("pageerror", (error) => problems.push(`exception: ${error.message}`))
  page.on("requestfailed", (request) =>
    problems.push(`request failed: ${request.url()}`)
  )
  const response = await page.goto(`${base}/docs/${slug}`, {
    waitUntil: "networkidle",
  })
  if (!response?.ok()) problems.push(`status ${response?.status()}`)
  await page.waitForTimeout(500)
  const demos = await page.locator("text=Replay").count()
  console.log(`${problems.length ? "✗" : "✓"} ${slug} (${demos} demos)`)
  for (const problem of problems) console.log(`    ${problem}`)
  if (problems.length) failed++
  await page.close()
}
await browser.close()
if (failed) process.exit(1)
