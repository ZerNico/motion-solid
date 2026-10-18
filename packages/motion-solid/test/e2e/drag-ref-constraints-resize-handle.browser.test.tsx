/**
 * Port of upstream's `cypress/integration/drag-ref-constraints-resize-handle.ts` and its page,
 * `dev/react/src/tests/drag-ref-constraints-resize-handle.tsx`.
 */
import { createSignal } from "solid-js"
import { motion } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * Test page for issue #2903: Drag constraints should update when the
 * draggable element is resized. Mirrors the CodeSandbox reproduction
 * which uses an externally-resizable modal (e.g. CSS `resize: both`
 * or imperative DOM resizing) where React state never changes.
 *
 * Container: 500x500
 * Draggable: starts at 100x100. Clicking the resize button mutates the
 * element's inline style directly — bypassing React state — so the only
 * signal that the size changed is ResizeObserver (matching the native
 * CSS resize-handle behaviour described in the issue).
 */
function App() {
    const [constraints, setConstraints] = createSignal<HTMLElement>()
    let box: HTMLDivElement | undefined

    const onResize = () => {
        if (box) {
            box.style.width = "300px"
            box.style.height = "300px"
        }
    }

    return (
        <div style={{ padding: "0", margin: "0" }}>
            <button
                id="resize-trigger"
                onClick={onResize}
                style={{
                    position: "fixed",
                    top: "10px",
                    right: "10px",
                    "z-index": 10,
                }}
            >
                Resize to 300x300
            </button>
            <motion.div
                id="constraints"
                ref={setConstraints}
                style={{
                    width: 500,
                    height: 500,
                    background: "rgba(0, 0, 255, 0.1)",
                    position: "relative",
                }}
            >
                <motion.div
                    id="box"
                    data-testid="draggable"
                    ref={(element) => (box = element)}
                    drag
                    dragConstraints={constraints}
                    dragElastic={0}
                    dragMomentum={false}
                    style={{
                        width: 100,
                        height: 100,
                        background: "red",
                    }}
                />
            </motion.div>
        </div>
    )
}

/**
 * Tests for issue #2903: Drag constraints should update when the
 * draggable element is resized via a path that bypasses React state
 * (e.g. CSS `resize: both` or imperative DOM resizing — the scenario
 * described in the linked CodeSandbox).
 *
 * - Container (#constraints): 500x500
 * - Draggable (#box): starts 100x100, grows to 300x300 when
 *   #resize-trigger is clicked. The handler mutates the element's
 *   inline style directly so the only signal of the size change is
 *   ResizeObserver — projection's normal lifecycle does not fire.
 *
 * Before resize: max travel = 400px (500 - 100)
 * After resize:  max travel = 200px (500 - 300)
 */
describe("Drag Constraints Update on Imperative Resize", () => {
    it("Updates drag constraints when element grows via direct DOM mutation", async () => {
        await visit(App)
        await wait(200)

        trigger(query("#resize-trigger"), "click")
        await wait(200)

        await should(() => {
            const { width, height } = query("#box").getBoundingClientRect()
            expect(width).toBe(300)
            expect(height).toBe(300)
        })

        const box = query("#box")
        await nextFrame()
        await nextFrame()
        trigger(box, "pointerdown", { x: 5, y: 5 })
        trigger(box, "pointermove", { x: 10, y: 10 })
        await nextFrame()
        await wait(50)
        trigger(box, "pointermove", { x: 600, y: 600, force: true })
        await nextFrame()
        await wait(50)
        trigger(box, "pointerup", { force: true })
        await wait(50)
        await should(() => {
            const { right, bottom } = box.getBoundingClientRect()
            // 300x300 box must stay inside the 500x500 container.
            // Without the fix, right/bottom would be ~700.
            expect(right).toBeLessThanOrEqual(502)
            expect(bottom).toBeLessThanOrEqual(502)
        })
    })
})
