/**
 * Port of upstream's `cypress/integration/drag-svg.ts` and its page,
 * `dev/react/src/tests/drag-svg.tsx`.
 */
import { motion } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

interface Params {
    axis?: "x" | "y"
    lock?: string
    top?: string
    left?: string
    right?: string
    bottom?: string
    layout?: string
}

// It's important for this test to only trigger a single rerender while dragging (in response to onDragStart) of draggable component.

function App(props: Params) {
    const axis = props.axis
    const lock = props.lock
    const top = parseFloat(props.top!) || undefined
    const left = parseFloat(props.left!) || undefined
    const right = parseFloat(props.right!) || undefined
    const bottom = parseFloat(props.bottom!) || undefined
    const layout = props.layout || undefined

    return (
        <svg style={{ width: "500px", height: "500px" }}>
            <motion.circle
                id="box"
                data-testid="draggable"
                drag={axis ? axis : true}
                dragElastic={0}
                dragMomentum={false}
                dragConstraints={{ top, left, right, bottom }}
                dragDirectionLock={!!lock}
                fill="red"
                cx={50}
                cy={50}
                r={20}
                layout={layout as any}
            />
        </svg>
    )
}

const draggable = () => query("[data-testid='draggable']")

function expectPosition(left: number, top: number) {
    return should(() => {
        const bbox = draggable().getBoundingClientRect()
        expect(bbox.left).toBe(left)
        expect(bbox.top).toBe(top)
    })
}

/**
 * The common gesture of most tests: pointerdown at (50, 50), a first move past the threshold to
 * (60, 60), then a move to `to` (all relative to the element's current box, like Cypress).
 */
async function drag(
    to: [number, number],
    { waitAfterDown = 0 }: { waitAfterDown?: number } = {}
) {
    trigger(draggable(), "pointerdown", { x: 50, y: 50, force: true })
    if (waitAfterDown) await wait(waitAfterDown)
    trigger(draggable(), "pointermove", { x: 60, y: 60, force: true }) // Gesture will start from first move past threshold
    await nextFrame()
    trigger(draggable(), "pointermove", { x: to[0], y: to[1], force: true })
    await nextFrame()
    trigger(draggable(), "pointerup", { force: true })
}

/**
 * In this test suite there's two sets of each test, one without and one with the `layout` prop.
 * This is because when a component has the layout prop applied, we apply drag to the bounding box
 * and when it isn't, we apply it to the x/y transform.
 *
 * Discrepancies between the expected values in the two sets of tests are *something* to do with how
 * pointer events are being resolved with Cypress, but a manual check will verify that both drag modes
 * are working visually the same.
 *
 * PanSession applies pointermove on the next animation frame, and pointerup
 * discards a move that hasn't been applied yet. Cypress also resolves trigger
 * coordinates against the element's current box. So each pointermove is
 * followed by nextFrame() rather than a fixed wait, which slow CI can outrun.
 *
 * Gestures that start straight after the page loads first wait two frames:
 * React 19 StrictMode remounts refs after the first paint, which cancels a
 * gesture started before then.
 */
describe("Drag SVG", () => {
    it("Drags the element by the defined distance", async () => {
        await visit(App)
        await wait(50)
        await nextFrame()
        await nextFrame()
        await drag([210, 310], { waitAfterDown: 50 })
        await expectPosition(200, 300)
    })

    it("Locks drag to x", async () => {
        await visit(App, { axis: "x" })
        await wait(200)
        await nextFrame()
        await nextFrame()
        await drag([200, 300])
        await expectPosition(190, 30)
    })

    it("Locks drag to y", async () => {
        await visit(App, { axis: "y" })
        await wait(200)
        await nextFrame()
        await nextFrame()
        await drag([200, 300])
        await expectPosition(30, 290)
    })

    // TODO: Figure out direction lock tests in Cypress (commented out upstream)

    it("Constraints as object: bottom right", async () => {
        await visit(App, { right: "100", bottom: "100" })
        await wait(200)
        await wait(100)
        await nextFrame()
        await nextFrame()
        await drag([200, 200])
        await expectPosition(130, 130)
    })

    it("Constraints as object: top left", async () => {
        await visit(App, { left: "-10", top: "-10" })
        await wait(200)
        await wait(100)
        await nextFrame()
        await nextFrame()
        await drag([10, 10])
        await expectPosition(20, 20)
    })
})

describe("Drag SVG & Layout", () => {
    it("Drags the element by the defined distance", async () => {
        await visit(App, { layout: "true" })
        await wait(50)
        await expectPosition(30, 30)
        await wait(50)
        await nextFrame()
        await nextFrame()
        await drag([200, 300])
        await expectPosition(190, 290)
    })

    it("Locks drag to x", async () => {
        await visit(App, { axis: "x", layout: "true" })
        await wait(200)
        await wait(200)
        await nextFrame()
        await nextFrame()
        await drag([200, 300], { waitAfterDown: 50 })
        await expectPosition(190, 30)
    })

    it("Locks drag to y", async () => {
        await visit(App, { axis: "y", layout: "true" })
        await wait(200)
        await wait(200)
        await nextFrame()
        await nextFrame()
        await drag([200, 300], { waitAfterDown: 50 })
        await expectPosition(30, 290)
    })

    // TODO: Figure out direction lock tests in Cypress (commented out upstream)

    it("Constraints as object: bottom right", async () => {
        await visit(App, { right: "100", bottom: "100", layout: "true" })
        await wait(200)
        await wait(200)
        await nextFrame()
        await nextFrame()
        await drag([200, 200])
        await expectPosition(130, 130)
    })

    it("Constraints as object: top left", async () => {
        await visit(App, { left: "-10", top: "-10", layout: "true" })
        await wait(200)
        await wait(200)
        await nextFrame()
        await nextFrame()
        await drag([10, 10])
        await expectPosition(20, 20)
    })
})
