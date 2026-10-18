/**
 * Port of upstream's `cypress/integration/drag-rotated-parent.ts` and its page,
 * `dev/react/src/tests/drag-rotated-parent.tsx`.
 */
import { createSignal } from "solid-js"
import { correctParentTransform, motion, MotionConfig } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

function App() {
    const [ref, setRef] = createSignal<HTMLDivElement>()

    return (
        <motion.div
            ref={setRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 400,
                height: 400,
                rotate: 180,
            }}
        >
            <MotionConfig transformPagePoint={correctParentTransform(ref)}>
                <motion.div
                    data-testid="draggable"
                    drag
                    dragElastic={0}
                    dragMomentum={false}
                    style={{
                        width: 100,
                        height: 100,
                        background: "red",
                    }}
                />
            </MotionConfig>
        </motion.div>
    )
}

describe("Drag with rotated parent", () => {
    it("Element follows cursor when parent is rotated 180deg", async () => {
        await visit(App)
        await wait(200)
        const el = query("[data-testid='draggable']")
        await wait(100)
        await nextFrame()
        await nextFrame()
        trigger(el, "pointerdown", { x: 50, y: 50 })
        trigger(el, "pointermove", { x: 55, y: 55 }) // Past threshold
        await nextFrame()
        await wait(50)
        trigger(el, "pointermove", { x: 150, y: 50, force: true }) // Move right
        await nextFrame()
        await wait(50)
        trigger(el, "pointerup", { force: true })
        await should(() => {
            const { left } = el.getBoundingClientRect()
            // Element starts at left=300 (child at top-left of 400x400
            // container rotated 180deg around center)
            // Cursor moved right, so element should also move right
            // Without fix (bug): left ≈ 205 (moves opposite to cursor)
            // With fix: left ≈ 405 (follows cursor)
            expect(left).toBeGreaterThan(350)
        })
    })
})
