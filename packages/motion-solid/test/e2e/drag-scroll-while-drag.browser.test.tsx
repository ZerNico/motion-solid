/**
 * Port of upstream's `cypress/integration/drag-scroll-while-drag.ts` and its page,
 * `dev/react/src/tests/drag-scroll-while-drag.tsx`.
 */
import type { JSX } from "@solidjs/web"
import { motion } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * Test for scroll-while-drag feature.
 * Verifies that dragging elements stay attached to the cursor
 * when scrolling occurs during drag.
 *
 * URL params:
 * - window=true: Test window scroll instead of element scroll
 *
 * Note: Window scroll is automatically handled by PanSession via pageX/pageY
 * coordinates. Element scroll requires explicit compensation.
 */
function App(props: { window?: string }) {
    const useWindowScroll = props.window === "true"

    if (useWindowScroll) {
        // Window scroll test: draggable in a tall document
        return (
            <div style={windowContentStyle}>
                <motion.div
                    id="draggable"
                    data-testid="draggable"
                    drag
                    dragElastic={0}
                    dragMomentum={false}
                    style={boxStyle}
                />
            </div>
        )
    }

    // Element scroll test: draggable in a scrollable container
    return (
        <div id="scrollable" data-testid="scrollable" style={scrollableStyle}>
            <div style={contentStyle}>
                <motion.div
                    id="draggable"
                    data-testid="draggable"
                    drag
                    dragElastic={0}
                    dragMomentum={false}
                    style={boxStyle}
                />
            </div>
        </div>
    )
}

const scrollableStyle: JSX.CSSProperties = {
    position: "fixed",
    top: "0px",
    left: "0px",
    width: "500px",
    height: "400px",
    overflow: "auto",
    background: "#f0f0f0",
}

const contentStyle: JSX.CSSProperties = {
    height: "1500px",
    width: "800px",
    "padding-top": "50px",
    "padding-left": "50px",
}

const windowContentStyle: JSX.CSSProperties = {
    height: "2000px",
    width: "100%",
    "padding-top": "50px",
    "padding-left": "50px",
    background: "#f0f0f0",
}

const boxStyle = {
    width: 100,
    height: 100,
    background: "#ff0066",
    borderRadius: 10,
}

/**
 * The shared start of every test: visit, then drag the element by 50px.
 */
async function startDrag(props: { window?: string } = {}) {
    await visit(App, props)
    await wait(200)
    const el = query("[data-testid='draggable']")
    await nextFrame()
    await nextFrame()
    trigger(el, "pointerdown", { x: 50, y: 50 })
    trigger(el, "pointermove", { x: 55, y: 55 }) // Start gesture
    await nextFrame()
    await wait(50)
    trigger(el, "pointermove", { x: 100, y: 100, force: true })
    await nextFrame()
    await wait(50)
    return el
}

/**
 * Tests for scroll-while-drag feature.
 * Verifies that draggable elements stay attached to the cursor
 * when scrolling occurs during drag.
 *
 * Note: Cypress has known quirks with pointer event coordinates that can cause
 * small position discrepancies. These tests verify the scroll compensation
 * prevents large position jumps, which is the core functionality.
 */
describe("Drag with element scroll during drag", () => {
    afterEach(() => {
        // End any drag left over by a failing test.
        trigger(window, "pointerup", { clientX: 0, clientY: 0 })
    })

    it("Element stays at same viewport position during scroll (no pointer move)", async () => {
        const scrollAmount = 100

        const el = await startDrag()
        const rectBefore = el.getBoundingClientRect()

        // Scroll the container during drag (no pointer move after)
        const scrollable = query("[data-testid='scrollable']")
        scrollable.scrollTop = scrollAmount

        // Wait for scroll event to be processed
        await wait(100)
        const rectAfter = el.getBoundingClientRect()

        // Element should stay at same viewport position
        // (within small tolerance for rendering)
        // (chai's closeTo(expected, 15))
        expect(Math.abs(rectAfter.top - rectBefore.top)).toBeLessThanOrEqual(15)
        expect(Math.abs(rectAfter.left - rectBefore.left)).toBeLessThanOrEqual(
            15
        )
    })

    it("Element scroll compensation prevents large position jumps", async () => {
        const scrollAmount = 200

        await startDrag()
        // Scroll the container during drag
        const scrollable = query("[data-testid='scrollable']")
        scrollable.scrollTop = scrollAmount
        await wait(100)
        // Continue dragging - move to the same position
        const el = query("[data-testid='draggable']")
        trigger(el, "pointermove", { x: 100, y: 100, force: true })
        await nextFrame()
        await wait(50)
        trigger(el, "pointerup", { force: true })
        await should(() => {
            const { top } = el.getBoundingClientRect()

            // Without scroll compensation, top would be negative (~-100)
            // because the element would "jump" by the scroll amount.
            // With scroll compensation, top should be positive and reasonable.
            expect(top).toBeGreaterThan(0)
            expect(top).toBeLessThan(scrollAmount)
        })
    })

    it("Element moves correctly without scroll", async () => {
        const el = await startDrag()
        trigger(el, "pointerup", { force: true })
        await should(() => {
            const { left, top } = el.getBoundingClientRect()

            // Element should be roughly at the drag position
            // Allow tolerance for Cypress coordinate quirks
            expect(left).toBeGreaterThan(50)
            expect(left).toBeLessThan(200)
            expect(top).toBeGreaterThan(50)
            expect(top).toBeLessThan(200)
        })
    })
})

describe("Drag with window scroll during drag", () => {
    afterEach(() => {
        trigger(window, "pointerup", { clientX: 0, clientY: 0 })
        window.scrollTo(0, 0)
    })

    /**
     * Note: This test verifies that window scroll compensation is applied.
     * Due to Cypress limitations with synthetic scroll events, the exact
     * positioning may vary. The real behavior is validated by manual testing.
     * The key assertion is that the element doesn't jump completely off-screen.
     */
    it("Element stays at same viewport position during window scroll (no pointer move)", async () => {
        const scrollAmount = 100

        const el = await startDrag({ window: "true" })

        // Scroll the window during drag (no pointer move after)
        window.scrollTo(0, scrollAmount)

        // Dispatch scroll event manually (Cypress may not trigger it automatically)
        window.dispatchEvent(new Event("scroll", { bubbles: true }))

        // Wait for scroll event to be processed
        await wait(100)
        const rectAfter = el.getBoundingClientRect()

        // The element should not jump completely off-screen.
        // Without any compensation, top would be ~-45 (negative).
        // With compensation, it should stay positive and reasonable.
        // Note: Cypress synthetic events may not perfectly replicate
        // real browser scroll behavior, so we use lenient bounds.
        expect(rectAfter.top).toBeGreaterThan(-50)
        expect(rectAfter.top).toBeLessThan(200)
    })

    it("Window scroll compensation prevents large position jumps", async () => {
        const scrollAmount = 200

        await startDrag({ window: "true" })
        // Scroll the window during drag
        window.scrollTo(0, scrollAmount)
        await wait(100)
        // Continue dragging - move to the same position
        const el = query("[data-testid='draggable']")
        trigger(el, "pointermove", { x: 100, y: 100, force: true })
        await nextFrame()
        await wait(50)
        trigger(el, "pointerup", { force: true })
        await should(() => {
            const { top } = el.getBoundingClientRect()

            // Window scroll is compensated during scroll (verified by "no pointer move" test).
            // Cypress trigger coordinates after scroll may not match real pointer behavior,
            // so we just verify the element is in a reasonable position (not off-screen).
            // Note: The strict "no pointer move" test verifies the actual compensation works.
            expect(top).toBeGreaterThan(-100)
            expect(top).toBeLessThan(500)
        })
    })

    it("Element moves correctly without window scroll", async () => {
        const el = await startDrag({ window: "true" })
        trigger(el, "pointerup", { force: true })
        await should(() => {
            const { left, top } = el.getBoundingClientRect()

            // Element should be roughly at the drag position
            expect(left).toBeGreaterThan(50)
            expect(left).toBeLessThan(200)
            expect(top).toBeGreaterThan(50)
            expect(top).toBeLessThan(200)
        })
    })
})
