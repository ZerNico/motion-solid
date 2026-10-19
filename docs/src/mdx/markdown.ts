/**
 * The pages as plain Markdown, for AI assistants and the "Copy page" button: `/docs/<slug>.md`,
 * `/llms.txt` (an index) and `/llms-full.txt` (every page). Node-only: it reads the MDX files and
 * the demo sources from disk.
 */
import { readFile } from "node:fs/promises"
import type { BlockContent, Root, RootContent } from "mdast"
import { toString } from "mdast-util-to-string"
import remarkGfm from "remark-gfm"
import remarkMdx from "remark-mdx"
import remarkParse from "remark-parse"
import remarkStringify from "remark-stringify"
import { unified } from "unified"
import { visit } from "unist-util-visit"
import { pages, sections, siteUrl, type Page } from "../pages.ts"

const contentDir = new URL("../content/", import.meta.url)

const packageManagers = [
  ["pnpm", "add"],
  ["npm", "install"],
  ["yarn", "add"],
  ["bun", "add"],
] as const

/**
 * Said at the top of every page: models know Motion for React, and would otherwise assume its API.
 */
const context =
  "This is the documentation of motion-solid (`@motion-s/solid`), a port of Motion for React to Solid 2. Where Solid differs from React, follow this documentation, not `motion/react`."

type MdxJsxFlowElement = Extract<RootContent, { type: "mdxJsxFlowElement" }>

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkGfm)
  .use(remarkStringify, { bullet: "-", fences: true, rule: "-" })

const attribute = (node: MdxJsxFlowElement, name: string) => {
  const found = node.attributes.find(
    (attr) => attr.type === "mdxJsxAttribute" && attr.name === name
  )
  if (!found || found.type !== "mdxJsxAttribute") return undefined
  return typeof found.value === "string" ? found.value : found.value?.value
}

const code = (lang: string, value: string): BlockContent => ({
  type: "code",
  lang,
  value: value.trimEnd(),
})

/**
 * An internal link (`/docs/use-scroll#options`) as a link to the page's Markdown on the site.
 */
function toMarkdownUrl(url: string) {
  const match = url.match(/^\/docs\/([^#?]+)(#.*)?$/)
  return match ? `${siteUrl}/docs/${match[1]}.md${match[2] ?? ""}` : url
}

export async function pageMarkdown(page: Page) {
  const file = new URL(`${page.slug}.mdx`, contentDir)
  const tree = processor.parse(await readFile(file, "utf8")) as Root

  // `import exampleSource from "../demos/animation/Example.tsx?source"`: the demo files by name.
  const sources = new Map<string, URL>()
  for (const node of tree.children) {
    if (node.type !== "mdxjsEsm") continue
    for (const [, name, path] of node.value.matchAll(
      /import\s+(\w+)\s+from\s+"([^"]+)\?source"/g
    )) {
      sources.set(name!, new URL(path!, file))
    }
  }

  // A component written on one line (`<Note>…</Note>`) is a paragraph with an inline element.
  visit(tree, "paragraph", (node, index, parent) => {
    const [child] = node.children
    if (node.children.length !== 1 || child?.type !== "mdxJsxTextElement")
      return
    if (!parent || index === undefined) return
    parent.children[index] = {
      type: "mdxJsxFlowElement",
      name: child.name,
      attributes: child.attributes,
      children: [{ type: "paragraph", children: child.children }],
    }
  })

  const replacements = new Map<RootContent, RootContent[]>()
  const pending: Promise<void>[] = []

  visit(tree, (node) => {
    if (node.type === "link") node.url = toMarkdownUrl(node.url)
    if (node.type === "mdxjsEsm") replacements.set(node, [])
    if (node.type === "mdxJsxTextElement") {
      // Inline HTML (`<kbd>Enter</kbd>`) as its text, components aren't written inline.
      if (!node.name || !/^[a-z]/.test(node.name)) {
        throw new Error(`${page.slug}: no Markdown for inline <${node.name}>`)
      }
      replacements.set(
        node,
        node.name === "kbd" || node.name === "code"
          ? [{ type: "inlineCode", value: toString(node) }]
          : (node.children as RootContent[])
      )
      return
    }
    if (node.type !== "mdxJsxFlowElement") return

    if (node.name === "Demo") {
      const name = attribute(node, "source")
      const source = name && sources.get(name)
      if (!source) {
        throw new Error(`${page.slug}: <Demo> without a ?source import`)
      }
      pending.push(
        readFile(source, "utf8").then((value) => {
          replacements.set(node, [code("tsx", value)])
        })
      )
    } else if (node.name === "InstallTabs") {
      const packages = attribute(node, "packages")
      replacements.set(node, [
        code(
          "sh",
          packageManagers
            .map(([pm, command]) => `${pm} ${command} ${packages}`)
            .join("\n")
        ),
      ])
    } else if (node.name === "Note") {
      const label =
        attribute(node, "title") ??
        (attribute(node, "type") === "warning" ? "Warning" : "Note")
      replacements.set(node, [
        {
          type: "blockquote",
          children: [
            {
              type: "paragraph",
              children: [
                { type: "strong", children: [{ type: "text", value: label }] },
              ],
            },
            ...(node.children as BlockContent[]),
          ],
        },
      ])
    } else {
      throw new Error(`${page.slug}: no Markdown for <${node.name}>`)
    }
  })
  await Promise.all(pending)

  visit(tree, (node, index, parent) => {
    const replacement = replacements.get(node as RootContent)
    if (!replacement || !parent || index === undefined) return
    parent.children.splice(index, 1, ...(replacement as never[]))
    return index + replacement.length
  })

  // The context goes right after the page's `# Title`.
  const titleIndex = tree.children.findIndex(
    (node) => node.type === "heading" && node.depth === 1
  )
  tree.children.splice(titleIndex + 1, 0, {
    type: "blockquote",
    children: [
      ...((processor.parse(context) as Root).children as BlockContent[]),
    ],
  })

  return processor.stringify(tree)
}

export function llmsTxt() {
  const lines = [
    "# motion-solid",
    "",
    "> A port of Motion for React (`motion/react` v14) to Solid 2: animations, gestures, exit and layout animations, scroll and motion values, on the same engine as Motion. Install `@motion-s/solid`.",
    "",
    context,
    "",
  ]
  for (const section of sections) {
    lines.push(`## ${section.title}`, "")
    for (const page of section.pages) {
      lines.push(
        `- [${page.title}](${siteUrl}/docs/${page.slug}.md): ${page.description}`
      )
    }
    lines.push("")
  }
  lines.push(
    "## Optional",
    "",
    `- [All pages](${siteUrl}/llms-full.txt): every page above in one file`,
    ""
  )
  return lines.join("\n")
}

export async function llmsFullTxt() {
  const all = await Promise.all(pages.map(pageMarkdown))
  return all.join("\n---\n\n")
}
