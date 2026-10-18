/**
 * Port of upstream's `cypress/integration/drag-nested.ts` and the page it visits,
 * `dev/react/src/tests/drag-layout-nested.tsx`.
 */
import { motion } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

interface Params {
    parentDrag?: string
    childDrag?: string
    parentLayout?: string
    childLayout?: string
    constraints?: string
    animation?: string
    bothAxes?: string
}

function App(params: Params) {
    let parentDrag = (params.parentDrag || true) as boolean | "x" | "y"
    let childDrag = (params.childDrag || true) as boolean | "x" | "y"
    const parentLayout = params.parentLayout ? true : undefined
    const childLayout = params.childLayout ? true : undefined
    const constraints = Boolean(params.constraints)
    const animation = Boolean(params.animation)
    const bothAxes = Boolean(params.bothAxes)

    if (bothAxes) {
        parentDrag = "y"
        childDrag = "x"
    }

    // Port note: upstream re-renders once after mounting ("Trigger layout projection in the
    // child", a `count` state set in an effect). A Solid component doesn't re-render, and a
    // state nothing reads changes nothing, so there's no equivalent.

    return (
        <div>
            <motion.div
                id="parent"
                drag={parentDrag}
                dragMomentum={animation}
                dragElastic={constraints && animation ? 0.5 : false}
                dragConstraints={constraints && { top: -10, right: 100 }}
                layout={parentLayout}
                style={b}
            >
                <motion.div
                    id="child"
                    drag={childDrag}
                    dragMomentum={animation}
                    dragElastic={constraints && animation ? 0.5 : false}
                    dragConstraints={
                        constraints && { top: 0, left: -100, right: 100 }
                    }
                    layout={childLayout}
                    style={a}
                >
                    <motion.div id="control" layoutId="test" style={c} />
                </motion.div>
            </motion.div>
        </div>
    )
}

const box = {
    position: "absolute",
    top: 0,
    left: 0,
    background: "#ff0055",
} as const

const b = {
    ...box,
    top: 100,
    left: 100,
    width: 300,
    height: 300,
    borderRadius: 10,
} as const

const a = {
    position: "relative",
    top: 50,
    left: 50,
    width: 600,
    height: 200,
    background: "#ffcc00",
    borderRadius: 10,
} as const

const c = {
    position: "relative",
    top: 50,
    left: 50,
    width: 100,
    height: 100,
    background: "#ffaa00",
    borderRadius: 10,
} as const

interface BoundingBox {
    top: number
    left: number
    width: number
    height: number
}

function expectBbox(element: HTMLElement, expectedBbox: Partial<BoundingBox>) {
    const bbox = element.getBoundingClientRect()
    expect(bbox.left).toBe(expectedBbox.left)
    expect(bbox.top).toBe(expectedBbox.top)
    expectedBbox.width && expect(bbox.width).toBe(expectedBbox.width)
    expectedBbox.height && expect(bbox.height).toBe(expectedBbox.height)
}

const expectAt = (selector: string, expected: Partial<BoundingBox>) =>
    should(() => expectBbox(query(selector), expected))

function params(parentLayout: boolean, childLayout: boolean, extra: Params) {
    const result: Params = { ...extra }
    if (parentLayout) result.parentLayout = "true"
    if (childLayout) result.childLayout = "true"
    return result
}

/**
 * PanSession applies pointermove on the next animation frame, and pointerup
 * discards a move that hasn't been applied yet. Cypress also resolves trigger
 * coordinates against the element's current box. So each pointermove is
 * followed by nextFrame() rather than a fixed wait, which slow CI can outrun.
 */
async function testNestedDrag(parentLayout: boolean, childLayout: boolean) {
    await visit(App, params(parentLayout, childLayout, {}))
    await wait(200)
    await expectAt("#parent", { top: 100, left: 100, width: 300, height: 300 })
    await expectAt("#child", { top: 150, left: 150, width: 600, height: 200 })
    await expectAt("#control", { top: 200, left: 200 })

    let element = query("#parent")
    await nextFrame()
    await nextFrame()
    trigger(element, "pointerdown", { x: 5, y: 5 })
    await wait(50)
    trigger(element, "pointermove", { x: 10, y: 10 }) // Gesture will start from first move past threshold
    await nextFrame()
    trigger(element, "pointermove", { x: 50, y: 50 })
    await nextFrame()
    trigger(element, "pointerup")
    await expectAt("#parent", { top: 150, left: 150, width: 300, height: 300 })
    await expectAt("#control", { top: 250, left: 250 })
    await expectAt("#child", { top: 200, left: 200, width: 600, height: 200 })

    element = query("#child")
    trigger(element, "pointerdown", { x: 5, y: 5 })
    await wait(50)
    trigger(element, "pointermove", { x: 10, y: 10 }) // Gesture will start from first move past threshold
    await nextFrame()
    trigger(element, "pointermove", { x: 50, y: 50 })
    await nextFrame()
    await expectAt("#parent", { top: 150, left: 150, width: 300, height: 300 })
    await expectAt("#child", { top: 250, left: 250, width: 600, height: 200 })
    await expectAt("#control", { top: 300, left: 300 })
    trigger(query("#control"), "pointerup")
    await wait(50)
    await expectAt("#parent", { top: 150, left: 150, width: 300, height: 300 })
    await expectAt("#child", { top: 250, left: 250, width: 600, height: 200 })
    await expectAt("#control", { top: 300, left: 300 })

    element = query("#parent")
    trigger(element, "pointerdown", { x: 5, y: 5 })
    await wait(50)
    trigger(element, "pointermove", { x: 10, y: 10 }) // Gesture will start from first move past threshold
    await nextFrame()
    trigger(element, "pointermove", { x: 50, y: 50 })
    await nextFrame()
    trigger(element, "pointerup")
    await expectAt("#parent", { top: 200, left: 200, width: 300, height: 300 })
    await expectAt("#child", { top: 300, left: 300, width: 600, height: 200 })
    await expectAt("#control", { top: 350, left: 350 })
}

describe("Nested drag", () => {
    it("Parent: layout, Child: layout", () => testNestedDrag(true, true))
    it("Parent: layout", () => testNestedDrag(true, false))
    it("Child: layout", () => testNestedDrag(false, true))
    it("Neither", () => testNestedDrag(false, false))
})

async function testNestedDragConstraints(
    parentLayout: boolean,
    childLayout: boolean
) {
    await visit(App, params(parentLayout, childLayout, { constraints: "true" }))
    await wait(200)
    let element = query("#parent")
    await nextFrame()
    await nextFrame()
    trigger(element, "pointerdown", { x: 40, y: 40 })
    await wait(50)
    trigger(element, "pointermove", { x: 35, y: 35 }) // Gesture will start from first move past threshold
    await nextFrame()
    trigger(element, "pointermove", { x: 20, y: 20 })
    await nextFrame()
    trigger(element, "pointerup")
    // Should have only moved 10 px to the top
    await expectAt("#parent", { top: 90, left: 75, width: 300, height: 300 })
    await expectAt("#child", { top: 140, left: 125, width: 600, height: 200 })
    await expectAt("#control", { top: 190, left: 175 })

    element = query("#parent")
    trigger(element, "pointerdown", { x: 5, y: 5 })
    await wait(50)
    trigger(element, "pointermove", { x: 10, y: 10 }) // Gesture will start from first move past threshold
    await nextFrame()
    trigger(element, "pointermove", { x: 200, y: 100 })
    await nextFrame()
    trigger(element, "pointerup")
    await expectAt("#parent", { top: 190, left: 200, width: 300, height: 300 })
    await expectAt("#control", { top: 290, left: 300 })
    await expectAt("#child", { top: 240, left: 250, width: 600, height: 200 })

    element = query("#child")
    trigger(element, "pointerdown", { x: 5, y: 5, force: true })
    await wait(50)
    trigger(element, "pointermove", { x: 10, y: 10, force: true }) // Gesture will start from first move past threshold
    await nextFrame()
    trigger(element, "pointermove", { x: 300, y: 100, force: true })
    await nextFrame()
    trigger(element, "pointerup")
    await expectAt("#parent", { top: 190, left: 200, width: 300, height: 300 })
    await expectAt("#child", { top: 340, left: 350, width: 600, height: 200 })
    await expectAt("#control", { top: 390, left: 400 })
}

describe("Nested drag with constraints", () => {
    it("Parent: layout, Child: layout", () =>
        testNestedDragConstraints(true, true))
    it("Parent: layout", () => testNestedDragConstraints(true, false))
    it("Child: layout", () => testNestedDragConstraints(false, true))
    it("Neither", () => testNestedDragConstraints(false, false))
})

async function testNestedDragConstraintsAndAnimation(
    parentLayout: boolean,
    childLayout: boolean
) {
    await visit(
        App,
        params(parentLayout, childLayout, {
            constraints: "true",
            animation: "true",
        })
    )
    await wait(200)
    const parent = query("#parent")
    await nextFrame()
    await nextFrame()
    trigger(parent, "pointerdown", { x: 5, y: 10 })
    await wait(50)
    trigger(parent, "pointermove", { x: 10, y: 10 }) // Gesture will start from first move past threshold
    await nextFrame()
    trigger(parent, "pointermove", { x: 200, y: 10, force: true })
    await nextFrame()
    // Should have only moved 10 px to the top
    await expectAt("#parent", { top: 100, left: 250, width: 300, height: 300 })
    await expectAt("#child", { top: 150, left: 300, width: 600, height: 200 })
    await expectAt("#control", { top: 200, left: 350 })
    trigger(query("#parent"), "pointerup")
    await wait(2000)
    // Should have only moved 10 px to the top
    await expectAt("#parent", { top: 100, left: 200, width: 300, height: 300 })
    await expectAt("#child", { top: 150, left: 250, width: 600, height: 200 })
    await expectAt("#control", { top: 200, left: 300 })

    const child = query("#child")
    trigger(child, "pointerdown", { x: 5, y: 10 })
    await wait(50)
    trigger(child, "pointermove", { x: 10, y: 10 }) // Gesture will start from first move past threshold
    await nextFrame()
    trigger(child, "pointermove", { x: 200, y: 10, force: true })
    await nextFrame()
    await expectAt("#child", { top: 150, left: 400, width: 600, height: 200 })
    trigger(child, "pointerup")
    await wait(2000)
    await expectAt("#child", { top: 150, left: 350, width: 600, height: 200 })
}

async function testAlternateAxes(parentLayout: boolean, childLayout: boolean) {
    await visit(App, params(parentLayout, childLayout, { bothAxes: "true" }))
    await wait(200)
    const child = query("#child")
    await nextFrame()
    await nextFrame()
    trigger(child, "pointerdown", { x: 5, y: 5, force: true })
    await wait(80)
    trigger(child, "pointermove", { x: 10, y: 10, force: true })
    await nextFrame()
    trigger(child, "pointermove", { x: 100, y: 100, force: true })
    await nextFrame()
    await expectAt("#child", { top: 250, left: 250, width: 600, height: 200 })
    await expectAt("#control", { top: 300, left: 300 })
    await expectAt("#parent", { top: 200, left: 100, width: 300, height: 300 })
    await wait(30)
    trigger(query("#child"), "pointerup", { force: true })
    await wait(80)
    await expectAt("#child", { top: 250, left: 250, width: 600, height: 200 })
    await expectAt("#control", { top: 300, left: 300 })
    await expectAt("#parent", { top: 200, left: 100, width: 300, height: 300 })
}

describe("Nested drag with alternate draggable axes", () => {
    /**
     * Skipping for now as there are still issues when either draggable
     * component is also involved in layout animation
     */
    it("Parent: layout, Child: layout", () => testAlternateAxes(true, true))
    it("Parent: layout", () => testAlternateAxes(true, false))
    it("Child: layout", () => testAlternateAxes(false, true))
    it("Neither", () => testAlternateAxes(false, false))
})

describe("Nested drag with constraints and animation", () => {
    it("Parent: layout, Child: layout", () =>
        testNestedDragConstraintsAndAnimation(true, true))
    it("Parent: layout", () =>
        testNestedDragConstraintsAndAnimation(true, false))
    it("Child: layout", () =>
        testNestedDragConstraintsAndAnimation(false, true))
    it("Neither", () => testNestedDragConstraintsAndAnimation(false, false))
})
