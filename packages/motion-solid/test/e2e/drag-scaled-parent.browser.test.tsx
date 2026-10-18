/**
 * Port of upstream's `cypress/integration/drag-scaled-parent.ts` and its page,
 * `dev/react/src/tests/drag-scaled-parent.tsx`.
 */
import { createSignal } from "solid-js"
import { correctParentTransform, motion, MotionConfig } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * Reproduction for #3132: drag inside a parent with transform: scale()
 * Uses correctParentTransform to compensate for the parent's scale.
 */
function App(props: { scale?: string }) {
    const scale = parseFloat(props.scale || "0.5")
    const [ref, setRef] = createSignal<HTMLDivElement>()

    return (
        <div
            ref={setRef}
            id="container"
            style={{
                width: "800px",
                height: "800px",
                background: "blue",
                transform: `scale(${scale})`,
                "transform-origin": "top left",
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
        </div>
    )
}

async function dragFrom10To110() {
    await wait(200)
    const el = query("[data-testid='draggable']")
    await wait(100)
    await nextFrame()
    await nextFrame()
    trigger(el, "pointerdown", { x: 10, y: 10 })
    trigger(el, "pointermove", { x: 15, y: 15 }) // Past threshold
    await nextFrame()
    await wait(50)
    trigger(el, "pointermove", { x: 110, y: 110, force: true })
    await nextFrame()
    await wait(50)
    trigger(el, "pointerup", { force: true })
    return el
}

describe("Drag with scaled parent", () => {
    it("Element follows cursor when parent has scale(0.5)", async () => {
        await visit(App)
        const el = await dragFrom10To110()
        await should(() => {
            const { left, top } = el.getBoundingClientRect()

            // Parent has scale(0.5) with transformOrigin: top left
            // Element starts at (0,0) in parent space, which renders at (0,0) on screen
            // After dragging to pointermove(110,110) from pointerdown(10,10),
            // the screen delta is 100px.
            // The element should follow the cursor, so its rendered position
            // should be near the pointer position.
            // Without fix: left ≈ 50 (half of expected, because translate(100)
            // in a scale(0.5) parent renders as 50px)
            // With fix: left ≈ 100 (element follows cursor)
            expect(left).toBeGreaterThan(80)
            expect(left).toBeLessThan(120)
            expect(top).toBeGreaterThan(80)
            expect(top).toBeLessThan(120)
        })
    })

    it("Element follows cursor when parent has scale(2)", async () => {
        await visit(App, { scale: "2" })
        const el = await dragFrom10To110()
        await should(() => {
            const { left, top } = el.getBoundingClientRect()

            // Parent has scale(2) with transformOrigin: top left
            // Screen delta is 100px.
            // Without fix: left ≈ 200 (double, because translate(100)
            // in a scale(2) parent renders as 200px)
            // With fix: left ≈ 100 (element follows cursor)
            expect(left).toBeGreaterThan(80)
            expect(left).toBeLessThan(120)
            expect(top).toBeGreaterThan(80)
            expect(top).toBeLessThan(120)
        })
    })
})
