import { valueToEstree } from "estree-util-value-to-estree"
import GithubSlugger from "github-slugger"
import type { Root } from "mdast"
import { toString } from "mdast-util-to-string"
import { visit } from "unist-util-visit"

export interface TocEntry {
    id: string
    title: string
    depth: 2 | 3
}

/**
 * Exports the page's `##` and `###` headings as `toc`, with the ids `rehype-slug` gives them.
 */
export function remarkToc() {
    return (tree: Root) => {
        const slugger = new GithubSlugger()
        const toc: TocEntry[] = []
        visit(tree, "heading", (heading) => {
            const title = toString(heading)
            // Every heading takes an id, so the ids of later ones match rehype-slug's.
            const id = slugger.slug(title)
            if (heading.depth === 2 || heading.depth === 3) {
                toc.push({ id, title, depth: heading.depth })
            }
        })
        tree.children.push({
            type: "mdxjsEsm",
            value: "",
            data: {
                estree: {
                    type: "Program",
                    sourceType: "module",
                    body: [
                        {
                            type: "ExportNamedDeclaration",
                            specifiers: [],
                            source: null,
                            attributes: [],
                            declaration: {
                                type: "VariableDeclaration",
                                kind: "const",
                                declarations: [
                                    {
                                        type: "VariableDeclarator",
                                        id: { type: "Identifier", name: "toc" },
                                        init: valueToEstree(toc) as any,
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        } as any)
    }
}
