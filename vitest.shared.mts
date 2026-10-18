import { resolve, dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "vite"
import type { UserWorkspaceConfig } from "vitest/config"
import solid from "@solidjs/vite-plugin"
import { playwright } from "@vitest/browser-playwright"
import { closeSsrServer, renderOnServer } from "./test/ssr/renderOnServer.mts"

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))

/**
 * Server-rendered trees live in `*.fixtures.tsx` modules (Solid compiles JSX differently for the
 * server and the client). This tags their exported components with their module id, which the
 * `renderToString` test helper uses to render them on the server (adapted from base-ui-solid).
 */
function ssrFixturesPlugin(): Plugin {
    return {
        name: "motion-solid:ssr-fixtures",
        enforce: "pre",
        async closeBundle() {
            await closeSsrServer()
        },
        transform(code, id, options) {
            const file = id.split("?")[0]
            if (options?.ssr || !file.endsWith(".fixtures.tsx")) {
                return undefined
            }
            const moduleId = `/${relative(CURRENT_DIR, file)}`
            const names = Array.from(
                code.matchAll(
                    /export\s+(?:function|const)\s+([A-Za-z_$][\w$]*)/g
                ),
                (match) => match[1]
            )
            const tags = names
                .map(
                    (name) =>
                        `if (typeof ${name} === 'function') Object.defineProperty(${name}, '__ssrSource', { value: { moduleId: ${JSON.stringify(
                            moduleId
                        )}, exportName: ${JSON.stringify(name)} } });`
                )
                .join("\n")
            return { code: `${code}\n${tags}\n`, map: null }
        },
    }
}

type BrowserName = "chromium" | "firefox" | "webkit"

/**
 * Ported upstream tests run in jsdom, like upstream (Jest + jsdom). Our own tests depend on real
 * layout and run in a browser (`*.browser.test.tsx`), Chromium unless `VITEST_BROWSER` says
 * otherwise (`firefox`, `webkit`, `all`).
 */
export function createConfig(
    kind: "upstream" | "browser"
): UserWorkspaceConfig {
    const browserEnv = process.env.VITEST_BROWSER ?? "chromium"
    const browsers: BrowserName[] =
        browserEnv === "all"
            ? ["chromium", "firefox", "webkit"]
            : [browserEnv as BrowserName]

    return {
        // Client code is compiled hydratable, so tests can hydrate server-rendered markup.
        plugins: [
            solid({ ssr: true, hot: false, solid: { hydratable: true } }),
            ssrFixturesPlugin(),
        ],
        test: {
            globals: true,
            env: { VITEST: "true" },
            ...(kind === "upstream"
                ? {
                      include: [
                          "src/**/*.test.{ts,tsx}",
                          "test/**/*.test.{ts,tsx}",
                      ],
                      exclude: ["**/node_modules/**", "**/*.browser.test.*"],
                      environment: "jsdom",
                      environmentOptions: {
                          jsdom: {
                              pretendToBeVisual: true,
                              url: "http://localhost",
                          },
                      },
                      setupFiles: [
                          resolve(CURRENT_DIR, "./test/setupVitest.ts"),
                          resolve(CURRENT_DIR, "./test/upstream-setup.ts"),
                      ],
                  }
                : {
                      include: [
                          "src/**/*.browser.test.{ts,tsx}",
                          "test/**/*.browser.test.{ts,tsx}",
                      ],
                      setupFiles: [
                          resolve(CURRENT_DIR, "./test/setupVitest.ts"),
                      ],
                      browser: {
                          enabled: true,
                          provider: playwright(),
                          screenshotFailures: false,
                          commands: {
                              renderOnServer: (
                                  _context,
                                  moduleId: string,
                                  exportName: string,
                                  props: unknown
                              ) => renderOnServer(moduleId, exportName, props),
                          },
                          headless: true,
                          instances: browsers.map((browser) => ({ browser })),
                      },
                  }),
        },
    }
}
