/**
 * Port of upstream's `cypress/integration/drag-ref-constraints-absolute-scrolled.ts` and its
 * page, `dev/react/src/tests/drag-ref-constraints-absolute-scrolled.tsx`.
 */
import { createSignal, onSettled } from "solid-js"
import { motion } from "../../src"
import {
    VIEWPORT,
    nextFrame,
    query,
    should,
    trigger,
    visit,
    wait,
} from "./utils"

/**
 * Test page for issue #2829: When dragConstraints is set to a ref pointing
 * to a viewport-sized element (`position: absolute; inset: 0`), drag should
 * work across the full constraint area regardless of initial scroll position.
 *
 * The page is tall enough to scroll. We scroll the window in a layout effect
 * to simulate a page being refreshed after the user had scrolled, which is
 * the exact scenario the bug reporter described.
 */
function App(params: { scroll?: string }) {
    const [constraints, setConstraints] = createSignal<HTMLDivElement>()

    const initialScroll = Number(params.scroll || "300")

    // Port note: upstream scrolls in a layout effect (`useLayoutEffect`).
    onSettled(() => {
        window.scrollTo(0, initialScroll)
    })

    return (
        <div style={{ height: "3000px", margin: "0", padding: "0" }}>
            <div
                id="constraints"
                ref={setConstraints}
                style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    right: "0",
                    bottom: "0",
                    background: "rgba(0, 0, 255, 0.1)",
                }}
            >
                <motion.div
                    id="box"
                    data-testid="draggable"
                    drag
                    dragConstraints={constraints}
                    dragElastic={0}
                    dragMomentum={false}
                    style={{
                        width: 50,
                        height: 50,
                        background: "red",
                        position: "absolute",
                        top: 0,
                        left: 0,
                    }}
                />
            </div>
        </div>
    )
}

const defaultViewport = { ...VIEWPORT }

afterEach(() => {
    Object.assign(VIEWPORT, defaultViewport)
})

/**
 * Tests for issue #2829: Drag with ref-based constraints on a viewport-sized
 * element (`position: absolute; inset: 0`) should allow dragging to the bottom
 * of the visible viewport, even when the page is loaded with scroll restored.
 *
 * The test page scrolls the window in a layout effect before drag is wired up,
 * mimicking the browser restoring scroll position on refresh.
 */
describe("Drag with ref constraints on absolute element after scroll", () => {
    it("Allows dragging to the visible bottom of the viewport after scroll", async () => {
        // `cy.viewport(1000, 800)` before `cy.visit()`: visit() resizes to VIEWPORT.
        VIEWPORT.height = 800
        await visit(App, { scroll: "300" })
        await wait(300)
        expect(window.scrollY).toBeGreaterThan(0)
        const element = query("[data-testid='draggable']")
        await nextFrame()
        await nextFrame()
        trigger(element, "pointerdown", { x: 5, y: 5, force: true })
        trigger(element, "pointermove", { x: 10, y: 10, force: true })
        await nextFrame()
        await wait(50)
        trigger(element, "pointermove", { x: 900, y: 1500, force: true })
        await nextFrame()
        await wait(50)
        trigger(element, "pointerup", { force: true })
        await wait(100)
        await should(() => {
            const rect = element.getBoundingClientRect()
            // viewport: 1000x800, scroll: 300, box: 50x50
            // Constraint is `position: absolute; inset: 0` (viewport-sized
            // at the document origin). After the page is loaded scrolled,
            // the visible portion of the constraint spans viewport y ∈
            // [0, 500]. Before the fix, drag constraints were computed
            // with a stale scroll offset, clamping the box's bottom to
            // ~200 (= viewportH - 2*scrollY - boxH). With the fix, the
            // box should reach the constraint's visible bottom (~500).
            expect(Math.abs(rect.bottom - 500)).toBeLessThanOrEqual(5) // closeTo(500, 5)
        })
    })
})
