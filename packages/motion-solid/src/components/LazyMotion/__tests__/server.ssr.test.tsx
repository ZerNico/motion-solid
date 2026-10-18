import { renderToString } from "../../../../test/renderToString"
import { LazyFeatures } from "./server.ssr.fixtures"

const counter = globalThis as { __lazyMotionServerLoads?: number }

describe("LazyMotion (server)", () => {
    test("doesn't load lazy features on the server", async () => {
        const warn = vi.spyOn(console, "warn")
        counter.__lazyMotionServerLoads = 0

        const { html } = await renderToString(LazyFeatures)
        // Let the loader's promise settle.
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(html).toContain("opacity:0.5")
        expect(counter.__lazyMotionServerLoads).toBe(0)
        expect(
            warn.mock.calls.some((args) =>
                String(args[0]).includes("SERVER_WRITE")
            )
        ).toBe(false)
        warn.mockRestore()
    })
})
