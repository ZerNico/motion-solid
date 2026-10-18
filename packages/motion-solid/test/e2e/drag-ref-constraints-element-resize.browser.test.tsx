/**
 * Port of upstream's `cypress/integration/drag-ref-constraints-element-resize.ts` and its page,
 * `dev/react/src/tests/drag-ref-constraints-element-resize.tsx`.
 */
import { createSignal } from "solid-js"
import { motion, useMotionValue, useTransform } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * Test page for issue #2458: Drag constraints should update when
 * the draggable element's dimensions change.
 *
 * Container: 500x500, positioned at top-left
 * Draggable: starts at 100x100, can be resized to 300x300
 *
 * Before resize: constraints allow 400px of travel (500 - 100)
 * After resize: constraints should allow 200px of travel (500 - 300)
 */
function App() {
    const [constraints, setConstraints] = createSignal<HTMLElement>()
    const widthMV = useMotionValue(100)
    const heightMV = useMotionValue(100)
    const width = useTransform(widthMV, (v) => `${v}px`)
    const height = useTransform(heightMV, (v) => `${v}px`)

    const handleResize = () => {
        widthMV.set(300)
        heightMV.set(300)
    }

    return (
        <div style={{ padding: "0", margin: "0" }}>
            <button
                id="resize-trigger"
                onClick={handleResize}
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
                    drag
                    dragConstraints={constraints}
                    dragElastic={0}
                    dragMomentum={false}
                    style={{
                        width,
                        height,
                        background: "red",
                    }}
                />
            </motion.div>
        </div>
    )
}

async function dragBy(box: Element, to: number) {
    trigger(box, "pointerdown", { x: 5, y: 5 })
    trigger(box, "pointermove", { x: 10, y: 10 })
    await nextFrame()
    await wait(50)
    trigger(box, "pointermove", { x: to, y: to, force: true })
    await nextFrame()
    await wait(50)
    trigger(box, "pointerup", { force: true })
    await wait(50)
}

function expectWithinContainer(box: Element) {
    const { right, bottom } = box.getBoundingClientRect()
    expect(right).toBeLessThanOrEqual(502)
    expect(bottom).toBeLessThanOrEqual(502)
}

/**
 * Tests for issue #2458: Drag constraints should update when the
 * draggable element or constraint container resizes.
 *
 * The test page has:
 * - Container (#constraints): 500x500
 * - Draggable (#box): starts 100x100, resizable to 300x300 via button
 *
 * Before resize: max travel = 400px (500 - 100)
 * After resize: max travel = 200px (500 - 300)
 */
describe("Drag Constraints Update on Element Resize", () => {
    it("Constrains drag correctly before resize", async () => {
        await visit(App)
        await wait(200)
        const box = query("#box")
        await nextFrame()
        await nextFrame()
        await dragBy(box, 600)
        // 100x100 box in 500x500 container: max right/bottom = 500
        await should(() => expectWithinContainer(box))
    })

    it("Updates drag constraints after draggable element is resized", async () => {
        await visit(App)
        await wait(200)

        // Click resize button to resize draggable from 100x100 to 300x300
        trigger(query("#resize-trigger"), "click")
        await wait(200)

        // Verify the box is now 300x300
        await should(() => {
            const { width, height } = query("#box").getBoundingClientRect()
            expect(width).toBe(300)
            expect(height).toBe(300)
        })

        // Now drag to the far bottom-right
        const box = query("#box")
        await nextFrame()
        await nextFrame()
        await dragBy(box, 600)
        // 300x300 box in 500x500 container: max right/bottom = 500
        // Without the fix, right/bottom would be ~700 (300 + 400 old constraint)
        await should(() => expectWithinContainer(box))
    })

    it("Updates drag constraints after draggable element is resized, with existing drag offset", async () => {
        await visit(App)
        await wait(200)

        // First drag to an intermediate position
        const box = query("#box")
        await nextFrame()
        await nextFrame()
        await dragBy(box, 100)

        // Resize the element from 100x100 to 300x300
        trigger(query("#resize-trigger"), "click")
        await wait(200)

        // Now drag far to the bottom-right
        await dragBy(query("#box"), 600)
        // Even after a prior drag + resize, box must stay within container
        await should(() => expectWithinContainer(query("#box")))
    })
})
