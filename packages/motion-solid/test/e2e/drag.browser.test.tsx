/**
 * Port of upstream's `cypress/integration/drag.ts` and the pages it visits:
 * `dev/react/src/tests/drag.tsx`, `drag-ref-constraints.tsx`,
 * `drag-ref-constraints-resize.tsx`, `drag-snap-to-cursor.tsx` and
 * `drag-constraints-return.tsx`.
 */
import { createEffect, createSignal, onSettled } from "solid-js"
import { page } from "vitest/browser"
import { motion, useDragControls, useMotionValue } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * `dev/react/src/tests/drag.tsx`
 */
interface DragParams {
    axis?: string
    lock?: string
    percentage?: string
    top?: string
    left?: string
    right?: string
    bottom?: string
    showChild?: string
    return?: string
    x?: string
    y?: string
    layout?: string
}

function getValueParam(
    params: DragParams,
    name: "x" | "y",
    isPercentage: boolean
) {
    const param = params[name]
    if (!param) return 0
    if (isPercentage) {
        return param + "%"
    } else {
        return parseFloat(param)
    }
}

const parseParam = (param?: string) => parseFloat(param as string) || undefined

// It's important for this test to only trigger a single rerender while dragging (in response to onDragStart) of draggable component.
function Drag(params: DragParams) {
    const axis = params.axis
    const lock = params.lock
    const isPercentage = Boolean(params.percentage)
    const top = parseParam(params.top)
    const left = parseParam(params.left)
    const right = parseParam(params.right)
    const bottom = parseParam(params.bottom)
    const showChild = Boolean(params.showChild)
    const returnParam = params.return
    const snapToOrigin: boolean | "x" | "y" =
        returnParam === "x" || returnParam === "y"
            ? returnParam
            : Boolean(returnParam)
    const x = getValueParam(params, "x", isPercentage)
    const y = getValueParam(params, "y", isPercentage)
    const layout = params.layout || undefined

    // We do this to test when scroll position isn't 0/0
    onSettled(() => {
        window.scrollTo(0, 100)
    })

    return (
        <div style={{ height: "2000px", "padding-top": "100px" }}>
            <motion.div
                id="box"
                data-testid="draggable"
                drag={axis ? (axis as "x" | "y") : true}
                dragElastic={0}
                dragMomentum={false}
                dragConstraints={{ top, left, right, bottom }}
                dragSnapToOrigin={snapToOrigin}
                dragDirectionLock={!!lock}
                // Port note: upstream passes the URL parameter's string ("true").
                layout={layout as any}
                initial={{
                    width: 50,
                    height: 50,
                    background: "red",
                    x,
                    y,
                }}
            >
                {showChild ? (
                    <div
                        data-testid="draggable-child"
                        style={{
                            width: "50px",
                            height: "50px",
                            background: "blue",
                        }}
                    />
                ) : null}
            </motion.div>
        </div>
    )
}

/**
 * `dev/react/src/tests/drag-ref-constraints.tsx`
 */
function DragRefConstraints(params: { layout?: string }) {
    const [container, setContainer] = createSignal<HTMLElement>()
    const [dragging, setDragging] = createSignal(false)
    const layout = params.layout || undefined

    // We do this to test when scroll position isn't 0/0
    onSettled(() => {
        window.scrollTo(0, 100)
    })
    const x = useMotionValue("100%")

    return (
        <>
            <div style={{ height: "2000px", "padding-top": "100px" }}>
                <motion.div
                    data-testid="constraint"
                    style={{ width: 200, height: 200, background: "blue" }}
                    ref={setContainer}
                >
                    <motion.div
                        id="box"
                        data-testid="draggable"
                        drag
                        dragElastic={0}
                        dragMomentum={false}
                        style={{
                            width: 50,
                            height: 50,
                            background: dragging() ? "yellow" : "red",
                            x,
                        }}
                        dragConstraints={container}
                        layout={layout as any}
                        onDragStart={() => setDragging(true)}
                        onDragEnd={() => setDragging(false)}
                    />
                </motion.div>
            </div>
            <SiblingLayoutAnimation />
        </>
    )
}

/**
 * This sibling layout animation is designed to fuzz/stress the drag constraints
 * measurements. Remeasuring the constraints during drag would previously mess
 * up the position of the draggable element.
 */
function SiblingLayoutAnimation() {
    const [state, setState] = createSignal(false)

    createEffect(
        () => state(),
        (value) => {
            const timer = setTimeout(() => setState(!value), 200)

            return () => clearTimeout(timer)
        }
    )

    return (
        <motion.div
            layout
            style={{
                width: 200,
                height: 200,
                "border-radius": 20,
                background: "blue",
                position: "relative",
                left: state() ? "100px" : "0",
            }}
        />
    )
}

/**
 * `dev/react/src/tests/drag-ref-constraints-resize.tsx`
 */
function DragRefConstraintsResize() {
    const [ref, setRef] = createSignal<HTMLDivElement>()
    const [count, setCount] = createSignal(0)
    return (
        <div
            ref={setRef}
            style={{
                width: "50%",
                height: "300px",
                background: "blue",
                "border-radius": "20px",
                display: "flex",
                "justify-content": "center",
                "align-items": "center",
                margin: "0 auto",
            }}
            id="constraints"
        >
            <motion.div
                drag
                //dragElastic
                dragConstraints={ref}
                style={{
                    width: 200,
                    height: 200,
                    background: "red",
                    borderRadius: 20,
                }}
                onClick={() => setCount(count() + 1)}
                id="box"
            />
        </div>
    )
}

/**
 * `dev/react/src/tests/drag-snap-to-cursor.tsx`: an example of triggering drag from an external
 * element using useDragControls.
 */
function DragSnapToCursor() {
    const dragControls = useDragControls()

    return (
        <div
            style={{
                position: "absolute",
                top: "0",
                bottom: "0",
                left: "0",
                right: "0",
                background: "black",
                "padding-top": "1000px",
                height: "100vh",
                display: "flex",
            }}
        >
            <div
                style={{
                    width: "200px",
                    height: "200px",
                    background: "rgba(255,255,255,0.5)",
                    "border-radius": "20px",
                    margin: "20px",
                }}
                onPointerDown={(e) =>
                    dragControls.start(e, { snapToCursor: true })
                }
                id="scroll-trigger"
            />
            <motion.div
                drag
                dragControls={dragControls}
                whileTap={{ scale: 0.95 }}
                style={{
                    width: "50vw",
                    height: 300,
                    background: "white",
                    borderRadius: 20,
                }}
                id="scrollable"
            />
        </div>
    )
}

/**
 * `dev/react/src/tests/drag-constraints-return.tsx`
 */
function DragConstraintsReturn(params: { layout?: string }) {
    const [constraints, setConstraints] = createSignal<HTMLElement>()
    const layout = params.layout || undefined

    return (
        <motion.div
            id="constraints"
            ref={setConstraints}
            style={{
                width: 300,
                height: 300,
                background: "rgba(0, 0, 255, 0.2)",
            }}
        >
            <motion.div
                id="box"
                data-testid="draggable"
                drag
                dragConstraints={constraints}
                dragElastic={1}
                dragMomentum={false}
                layout={layout as any}
                style={{
                    width: 100,
                    height: 100,
                    background: "red",
                }}
            />
        </motion.div>
    )
}

const draggable = () => query("[data-testid='draggable']")

function expectPosition(element: Element, left: number, top: number) {
    const bbox = element.getBoundingClientRect()
    expect(bbox.left).toBe(left)
    expect(bbox.top).toBe(top)
}

/**
 * The common gesture of upstream's specs: `pointerdown` at `down`, a first `pointermove` at
 * `start` (the gesture starts from the first move past the threshold), then a `pointermove` at
 * `to` and `pointerup`, all relative to the element's current box like Cypress.
 */
async function dragGesture(
    element: Element,
    down: [number, number],
    start: [number, number],
    to: [number, number],
    { waitAfterDown = 0 }: { waitAfterDown?: number } = {}
) {
    await nextFrame()
    await nextFrame()
    trigger(element, "pointerdown", { x: down[0], y: down[1] })
    if (waitAfterDown) await wait(waitAfterDown)
    trigger(element, "pointermove", { x: start[0], y: start[1] })
    await nextFrame()
    trigger(element, "pointermove", { x: to[0], y: to[1], force: true })
    await nextFrame()
    trigger(element, "pointerup", { force: true })
}

/**
 * In this test suite there's two sets of each test, one without and one with the `layout` prop.
 * This is because when a component has the layout prop applied, we apply drag to the bounding box
 * and when it isn't, we apply it to the x/y transform.
 */
describe("Drag", () => {
    it("Drags the element by the defined distance", async () => {
        await visit(Drag)
        await wait(200)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 300])
        await should(() => expectPosition(draggable(), 200, 300))
    })

    it("Drags the element by the defined distance", async () => {
        await visit(Drag, { showChild: "true" })
        const child = query("[data-testid='draggable-child']")
        await wait(200)
        await dragGesture(child, [5, 5], [10, 10], [200, 300])
        await should(() => expectPosition(child, 200, 300))
    })

    it("Drags the element by the defined distance with different initial offset", async () => {
        await visit(Drag, { x: "100", y: "100" })
        await wait(200)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 300])
        await should(() => {
            const { left, top } = draggable().getBoundingClientRect()

            expect(left).toBe(300)

            // TODO: This should actually be 400, but for some reason the test scroll
            // scrolls an additional 100px when dragging starts. But this has been manually verified
            // as working
            expect(top).toBe(300)
        })
    })

    it("Drags the element by the defined distance with percentage initial offset", async () => {
        await visit(Drag, { x: "200", y: "200", percentage: "true" })
        await wait(200)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 300])
        await should(() => {
            const { left, top } = draggable().getBoundingClientRect()

            expect(left).toBe(300)

            // TODO: This should actually be 400, but for some reason the test scroll
            // scrolls an additional 100px when dragging starts. But this has been manually verified
            // as working
            expect(top).toBe(300)
        })
    })

    it("Locks drag to x", async () => {
        await visit(Drag, { axis: "x" })
        await wait(200)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 300], {
            waitAfterDown: 50,
        })
        await should(() => expectPosition(draggable(), 200, 0))
    })

    it("Locks drag to y", async () => {
        await visit(Drag, { axis: "y" })
        await wait(200)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 300])
        await should(() => expectPosition(draggable(), 0, 300))
    })

    it("Direction locks to y", async () => {
        await visit(Drag, { lock: "true" })
        await wait(200)
        const element = draggable()
        await wait(200)
        await nextFrame()
        await nextFrame()
        trigger(element, "pointerdown", { x: 5, y: 5, force: true })
        await wait(50)
        trigger(element, "pointermove", { x: 10, y: 10, force: true }) // Gesture will start from first move past threshold
        await nextFrame()
        trigger(element, "pointermove", { x: 10, y: 200, force: true })
        await nextFrame() // Locks the direction without moving
        await nextFrame()
        trigger(element, "pointermove", { x: 200, y: 10, force: true })
        await nextFrame()
        trigger(element, "pointerup", { force: true })
        await should(() => expectPosition(element, 0, 200))
    })

    it("Constraints as object: bottom right", async () => {
        await visit(Drag, { right: "100", bottom: "100" })
        await wait(200)
        await wait(100)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 200])
        await should(() => expectPosition(draggable(), 100, 100))
    })

    it("Constraints as object: top left", async () => {
        await visit(Drag, { left: "-10", top: "-10" })
        await wait(200)
        await wait(100)
        await dragGesture(draggable(), [40, 40], [30, 30], [10, 10])
        await should(() => expectPosition(draggable(), -10, -10))
    })

    it("Element returns to center with dragSnapToOrigin", async () => {
        await visit(Drag, { return: "true", left: "-10", top: "-10" })
        await wait(200)
        const element = draggable()
        await wait(100)
        await nextFrame()
        await nextFrame()
        trigger(element, "pointerdown", { x: 40, y: 40 })
        trigger(element, "pointermove", { x: 30, y: 30 }) // Gesture will start from first move past threshold
        await nextFrame()
        trigger(element, "pointermove", { x: 10, y: 10, force: true })
        await nextFrame()
        await should(() => expectPosition(element, -10, -10))
        trigger(element, "pointerup", { force: true })
        await wait(100)
        await should(() => expectPosition(draggable(), 0, 0))
    })

    it("Element returns to center on x axis only with dragSnapToOrigin='x'", async () => {
        await visit(Drag, { return: "x", left: "-10", top: "-10" })
        await wait(200)
        await wait(100)
        await dragGesture(draggable(), [40, 40], [30, 30], [10, 10])
        await wait(300)
        await should(() => {
            const { left, top } = draggable().getBoundingClientRect()

            // x should snap back to origin (0)
            expect(left).toBe(0)
            // y should NOT snap back - it stays at the constraint
            expect(top).toBe(-10)
        })
    })

    it("Element returns to center on y axis only with dragSnapToOrigin='y'", async () => {
        await visit(Drag, { return: "y", left: "-10", top: "-10" })
        await wait(200)
        await wait(100)
        await dragGesture(draggable(), [40, 40], [30, 30], [10, 10])
        await wait(300)
        await should(() => {
            const { left, top } = draggable().getBoundingClientRect()

            // x should NOT snap back - it stays at the constraint
            expect(left).toBe(-10)
            // y should snap back to origin (0)
            expect(top).toBe(0)
        })
    })

    it("doesn't reset drag constraints (ref-based), while dragging, on unrelated parent component updates", async () => {
        await visit(DragRefConstraints)
        await wait(200)
        await dragGesture(draggable(), [10, 10], [15, 15], [300, 300])
        await should(() => expectPosition(draggable(), 150, 150))
    })

    it("rescales draggable element in relation to resized constraints", async () => {
        await visit(DragRefConstraintsResize)
        await wait(200)
        await should(() => {
            const { left, top, right, bottom } =
                query("#constraints").getBoundingClientRect()
            expect(left).toBe(250)
            expect(top).toBe(0)
            expect(right).toBe(750)
            expect(bottom).toBe(300)
        })
        const box = query("#box")
        await should(() => {
            const { left, top, right, bottom } = box.getBoundingClientRect()
            expect(left).toBe(400)
            expect(top).toBe(50)
            expect(right).toBe(600)
            expect(bottom).toBe(250)
        })
        await nextFrame()
        await nextFrame()
        trigger(box, "pointerdown", { x: 5, y: 5 })
        trigger(box, "pointermove", { x: 10, y: 10 }) // Gesture will start from first move past threshold
        await nextFrame()
        trigger(box, "pointermove", { x: 200, y: 200, force: true })
        await nextFrame()
        trigger(box, "pointerup", { force: true, isPrimary: true })
        await wait(50)
        trigger(box, "pointermove", { x: 500, y: 500, force: true })
        await nextFrame()
        await should(() => {
            const { left, top, right, bottom } =
                query("#box").getBoundingClientRect()
            expect(left).toBe(550)
            expect(top).toBe(100)
            expect(right).toBe(750)
            expect(bottom).toBe(300)
        })

        await page.viewport(800, 660)
        await wait(50)
        await should(() => {
            const { left, right } =
                query("#constraints").getBoundingClientRect()
            expect(left).toBe(200)
            expect(right).toBe(600)
        })
        await should(() => {
            const { left, right } = query("#box").getBoundingClientRect()
            expect(left).toBe(400)
            expect(right).toBe(600)
        })

        await page.viewport(1000, 660)
        await wait(50)
        await should(() => {
            const { left, top, right, bottom } =
                query("#constraints").getBoundingClientRect()
            expect(left).toBe(250)
            expect(top).toBe(0)
            expect(right).toBe(750)
            expect(bottom).toBe(300)
        })
        await should(() => {
            const { left, right } = query("#box").getBoundingClientRect()
            expect(left).toBe(550)
            expect(right).toBe(750)
        })
    })

    it("Snaps to cursor", async () => {
        await visit(DragSnapToCursor)
        await wait(200)
        window.scrollTo(0, 800)
        await should(() => {
            const { top, left, right, bottom } =
                query("#scrollable").getBoundingClientRect()
            expect(top).toBe(200)
            expect(right).toBe(740)
            expect(bottom).toBe(500)
            expect(left).toBe(240)
        })
        await nextFrame()
        await nextFrame()
        trigger(query("#scroll-trigger"), "pointerdown", { x: 5, y: 5 })
        await wait(50)
        await should(() => {
            const { top, left, right, bottom } =
                query("#scrollable").getBoundingClientRect()
            expect(top).toBe(-125)
            expect(right).toBe(275)
            expect(bottom).toBe(175)
            expect(left).toBe(-225)
        })
    })
})

describe("Drag & Layout", () => {
    it("Drags the element by the defined distance", async () => {
        await visit(Drag, { layout: "true" })
        await wait(200)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 300])
        await should(() => expectPosition(draggable(), 200, 300))
    })

    it("Drags the element by the defined distance with different initial offset", async () => {
        await visit(Drag, { x: "100", y: "100", layout: "true" })
        await wait(200)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 300])
        await should(() => {
            const { left, top } = draggable().getBoundingClientRect()

            expect(left).toBe(300)

            // TODO: This should actually be 400, but for some reason the test scroll
            // scrolls an additional 100px when dragging starts. But this has been manually verified
            // as working
            expect(top).toBe(300)
        })
    })

    it("Locks drag to x", async () => {
        await visit(Drag, { axis: "x", layout: "true" })
        await wait(200)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 300])
        await should(() => expectPosition(draggable(), 200, 0))
    })

    it("Locks drag to y", async () => {
        await visit(Drag, { axis: "y", layout: "true" })
        await wait(200)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 300])
        await should(() => expectPosition(draggable(), 0, 300))
    })

    it("Direction locks to y", async () => {
        await visit(Drag, { lock: "true", layout: "true" })
        await wait(100)
        const element = draggable()
        await wait(200)
        await nextFrame()
        await nextFrame()
        trigger(element, "pointerdown", { x: 5, y: 5, force: true })
        trigger(element, "pointermove", { x: 10, y: 10, force: true }) // Gesture will start from first move past threshold
        await nextFrame()
        trigger(element, "pointermove", { x: 10, y: 200, force: true })
        await nextFrame() // Locks the direction without moving
        await nextFrame()
        trigger(element, "pointermove", { x: 200, y: 10, force: true })
        await nextFrame()
        trigger(element, "pointerup", { force: true })
        await should(() => expectPosition(element, 0, 200))
    })

    it("Constraints as object: bottom right", async () => {
        await visit(Drag, { right: "100", bottom: "100", layout: "true" })
        await wait(200)
        await dragGesture(draggable(), [5, 5], [10, 10], [200, 200])
        await should(() => expectPosition(draggable(), 100, 100))
    })

    it("Constraints as object: top left", async () => {
        await visit(Drag, { left: "-10", top: "-10", layout: "true" })
        await wait(200)
        await dragGesture(draggable(), [40, 40], [30, 30], [10, 10])
        await should(() => expectPosition(draggable(), -10, -10))
    })

    it("doesn't reset drag constraints (ref-based), while dragging, on unrelated parent component updates", async () => {
        await visit(DragRefConstraints, { layout: "true" })
        await wait(200)
        await dragGesture(draggable(), [10, 10], [15, 15], [300, 300])
        await should(() => expectPosition(draggable(), 150, 150))
    })
})

describe("Drag Constraints Return", () => {
    /**
     * Drags the element outside its constraints (to the bottom-right).
     */
    async function dragOutside(element: Element) {
        await wait(200)
        await wait(100)
        await nextFrame()
        await nextFrame()
        trigger(element, "pointerdown", { x: 50, y: 50, force: true })
        trigger(element, "pointermove", { x: 60, y: 60, force: true }) // Gesture will start from first move past threshold
        await nextFrame()
        // Drag outside constraints (to bottom-right)
        trigger(element, "pointermove", { x: 400, y: 400, force: true })
        await nextFrame()
    }

    function expectWithinConstraints(element: Element) {
        const { left, top, right, bottom } = element.getBoundingClientRect()

        // Constraints box is 300x300, element is 100x100
        // Element should be within the constraints (max position: 200, 200)
        expect(right).toBeLessThanOrEqual(302)
        expect(bottom).toBeLessThanOrEqual(302)
        expect(left).toBeGreaterThanOrEqual(-2)
        expect(top).toBeGreaterThanOrEqual(-2)
    }

    it("Returns to constraints when released outside bounds", async () => {
        await visit(DragConstraintsReturn)
        const element = draggable()
        await dragOutside(element)
        // Release - element should animate back
        trigger(element, "pointerup", { force: true })
        await wait(2000) // Wait for animation to complete
        await should(() => expectWithinConstraints(element))
    })

    it("Returns to constraints when released outside and clicked during animation", async () => {
        await visit(DragConstraintsReturn)
        const element = draggable()
        await dragOutside(element)
        // Release - element should start animating back
        trigger(element, "pointerup", { force: true })
        // Immediately click on element while it's animating back
        await wait(50)
        trigger(element, "pointerdown", { x: 50, y: 50, force: true })
        await wait(50)
        trigger(element, "pointerup", { force: true })
        await wait(2000) // Wait for animation to complete
        await should(() => expectWithinConstraints(element))
    })

    it("Does not jump when dragged again during animation", async () => {
        await visit(DragConstraintsReturn)
        const element = draggable()
        await dragOutside(element)
        // Release - element should start animating back
        trigger(element, "pointerup", { force: true })
        await wait(50)
        // Verify element is still animating (not yet within bounds)
        await should(() => {
            const { right, bottom } = element.getBoundingClientRect()
            // Element should still be outside constraints (animating back)
            expect(right).toBeGreaterThan(302)
            expect(bottom).toBeGreaterThan(302)
        })
        // Now grab and DRAG the element again with a LARGE drag (200px)
        // The bug causes a jump proportional to drag size
        trigger(element, "pointerdown", { x: 50, y: 50, force: true })
        trigger(element, "pointermove", { x: 60, y: 60, force: true }) // Start gesture
        await nextFrame()
        trigger(element, "pointermove", { x: 250, y: 250, force: true }) // Drag by ~200px
        await nextFrame()
        // Release again and measure on the very next frame. The element
        // legitimately springs back towards the constraints after that,
        // so a wall-clock wait would let it move too far on slow CI.
        const before = element.getBoundingClientRect()
        element.dispatchEvent(
            new PointerEvent("pointerup", {
                clientX: before.left + 50,
                clientY: before.top + 50,
                isPrimary: true,
                bubbles: true,
            })
        )
        await nextFrame()
        const { right, bottom } = element.getBoundingClientRect()
        // Allow small movement from animation starting, but no large jump (max 30px)
        // Bug: without fix, element jumps back towards first drag end position
        expect(Math.abs(right - before.right)).toBeLessThan(30)
        expect(Math.abs(bottom - before.bottom)).toBeLessThan(30)
    })
})
