/**
 * Port of upstream's `cypress/integration/layout-relative-drag.ts` and its page,
 * `dev/react/src/tests/layout-relative-drag.tsx`.
 *
 * Port note: the spec's `testNestedDrag` helper (page `drag-layout-nested`) isn't called by any
 * test upstream, so it isn't ported.
 */
import { createSignal, onSettled } from "solid-js"
import { motion } from "../../src"
import {
    nextFrame,
    query,
    should,
    trigger,
    visit,
    wait,
    type BoundingBox,
} from "./utils"

/**
 * Upstream's local `expectBbox` (not rounded).
 */
function expectBbox(element: Element, expectedBbox: BoundingBox) {
    const bbox = element.getBoundingClientRect()
    expect(bbox.left).toBe(expectedBbox.left)
    expect(bbox.top).toBe(expectedBbox.top)
    expect(bbox.width).toBe(expectedBbox.width)
    expect(bbox.height).toBe(expectedBbox.height)
}

function App() {
    const [state, setState] = createSignal(true)

    // Port note: upstream toggles unused state on mount to re-render the page once. A Solid
    // component doesn't re-render, so this has no effect on the motion components.
    onSettled(() => {
        setState(!state())
    })

    return (
        <motion.div
            id="parent"
            drag
            dragElastic={0}
            dragMomentum={false}
            layout
            style={{
                width: 200,
                height: 200,
                background: "red",
            }}
        >
            <motion.div
                id="child"
                layout
                style={{ width: 100, height: 100, background: "blue" }}
            />
        </motion.div>
    )
}

describe("Relative projection targets: Drag", () => {
    it("Child correctly follows parent", async () => {
        await visit(App)
        await wait(50)
        await should(() =>
            expectBbox(query("#parent"), {
                top: 0,
                left: 0,
                width: 200,
                height: 200,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 0,
                left: 0,
                width: 100,
                height: 100,
            })
        )
        const parent = query("#parent")
        await nextFrame()
        await nextFrame()
        trigger(parent, "pointerdown", { x: 5, y: 5, force: true })
        trigger(parent, "pointermove", { x: 10, y: 10, force: true })
        await nextFrame()
        await wait(50)
        trigger(parent, "pointermove", { x: 110, y: 110, force: true })
        await nextFrame()
        await should(() =>
            expectBbox(query("#parent"), {
                top: 110,
                left: 110,
                width: 200,
                height: 200,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 110,
                left: 110,
                width: 100,
                height: 100,
            })
        )
    })
})
