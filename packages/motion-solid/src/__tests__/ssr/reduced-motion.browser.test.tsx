import { renderToString } from "../../../test/renderToString"
import { AnimateWhileHydrating, ReducedMotionText } from "./ssr.fixtures"

/**
 * In its own file: the device setting is read once per page, and the other SSR tests read it
 * before this one could stub it.
 */
beforeEach(() => {
    vi.spyOn(window, "matchMedia").mockImplementation(
        (query) =>
            ({
                matches: query === "(prefers-reduced-motion)",
                media: query,
                addEventListener: () => {},
                removeEventListener: () => {},
            } as unknown as MediaQueryList)
    )
})

test("useReducedMotion renders the server value while hydrating, then the device's", async () => {
    const { container, html, hydrate } = await renderToString(ReducedMotionText)
    expect(html).toMatch(/id="value"[^>]*>null</)
    hydrate()
    await vi.waitFor(() =>
        expect(container.querySelector("#value")!.textContent).toBe("true")
    )
})

test("useAnimate reduces motion while hydrating", async () => {
    const { container, hydrate } = await renderToString(AnimateWhileHydrating)
    hydrate()
    const box = container.querySelector("#box") as HTMLElement
    // Reduced motion makes the transform instant instead of a 10s animation.
    await vi.waitFor(() =>
        expect(box.style.transform).toBe("translateX(100px)")
    )
})
