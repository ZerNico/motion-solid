import { codeToHtml } from "shiki"

export const themes = { light: "github-light", dark: "github-dark" } as const

/**
 * Highlights code the same way as the code blocks of the MDX pages.
 */
export const highlight = (code: string, lang: string) =>
  codeToHtml(code, { lang, themes, defaultColor: false })
