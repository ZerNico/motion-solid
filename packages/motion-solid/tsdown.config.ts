import { defineConfig, type UserConfig } from "tsdown"
import solid from "unplugin-solid/rolldown"

/**
 * One file per module, for the package's public entry points.
 */
const entry = {
    index: "./src/index.ts",
    dom: "./src/dom.ts",
    "dom-mini": "./src/dom-mini.ts",
    mini: "./src/mini.ts",
    projection: "./src/projection.ts",
    debug: "./src/debug.ts",
}

const shared: UserConfig = {
    entry,
    format: "esm",
    unbundle: true,
    platform: "neutral",
    target: "es2022",
    tsconfig: "../../tsconfig.json",
    sourcemap: true,
}

export default defineConfig([
    /**
     * Compiled for the browser: the default for apps without Solid's compiler.
     */
    {
        ...shared,
        outDir: "dist/dom",
        dts: true,
        plugins: [solid()],
    },
    /**
     * Compiled for server rendering (the `node` condition).
     */
    {
        ...shared,
        outDir: "dist/server",
        plugins: [solid({ ssr: true })],
    },
    /**
     * JSX kept as is (the `solid` condition): apps with Solid's compiler compile it for their
     * target (DOM, SSR, hydration).
     */
    {
        ...shared,
        outDir: "dist/source",
        sourcemap: false,
        inputOptions: { transform: { jsx: "preserve" } },
        outExtensions: () => ({ js: ".jsx" }),
    },
])
