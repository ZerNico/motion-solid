import { startOptimizedAppearAnimation } from "../.."
import { renderToString } from "../../../test/renderToString"
import { Appear } from "./appear.fixtures"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const opacity = (element: Element) => Number(getComputedStyle(element).opacity)

/**
 * Optimised appear animations: started on server-rendered markup before hydration (by an inline
 * script on a real page), and handed off to Motion when the component hydrates.
 */
describe("optimised appear animations", () => {
    test("hands off to the hydrated component without restarting", async () => {
        const { container, html, hydrate } = await renderToString(Appear)
        expect(html).toContain('data-framer-appear-id="appear-box"')
        expect(html).toContain("opacity:0")
        const box = container.querySelector("#box") as HTMLElement

        // On a real page, this runs before Motion is loaded.
        window.MotionIsMounted = false
        startOptimizedAppearAnimation(box, "opacity", [0, 1], {
            duration: 1000,
            ease: "linear",
        })

        await sleep(400)
        const beforeHydration = opacity(box)
        expect(beforeHydration).toBeGreaterThan(0.2)
        expect(beforeHydration).toBeLessThan(0.7)

        hydrate()
        await nextFrame()
        await nextFrame()

        // Continues from where the appear animation was, instead of starting from 0 again.
        expect(opacity(box)).toBeGreaterThanOrEqual(beforeHydration - 0.05)
        await vi.waitFor(() =>
            expect(window.MotionHandoffIsComplete?.("appear-box")).toBe(true)
        )
        await vi.waitFor(() => expect(opacity(box)).toBe(1), { timeout: 2000 })
    })
})
