/**
 * Port of upstream's `cypress/integration/drag-framer-page.ts` and its page,
 * `dev/react/src/tests/drag-framer-page.tsx`.
 */
import { motion, useMotionValue, type MotionValue } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * This demo copies the rough setup of a nested Scroll/Page
 * combo in Framer.
 */
function App() {
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const dummyX = useMotionValue(0)
    const dummyY = useMotionValue(0)

    return (
        <motion.div style={scrollContainer} layout>
            <motion.div
                id="parent"
                style={b}
                drag="y"
                _dragX={dummyX}
                _dragY={dummyY}
            >
                <motion.div style={{ ...pageContainer, x, y }} layout id="Page">
                    <Page x={x} y={y} id="a" />
                    <Page x={x} y={y} id="b" />
                    <Page x={x} y={y} />
                    <Page x={x} y={y} />
                </motion.div>
            </motion.div>
        </motion.div>
    )
}

function Page(props: {
    x: MotionValue<number>
    y: MotionValue<number>
    id?: string
}) {
    return (
        <motion.div
            layout
            _dragX={props.x}
            _dragY={props.y}
            id={props.id}
            drag="x"
            style={{
                width: 180,
                height: 180,
                background: "#ffcc00",
                borderRadius: 10,
                flex: "0 0 180px",
            }}
        >
            <motion.div layout style={c} />
        </motion.div>
    )
}

const scrollContainer = {
    position: "absolute",
    top: 100,
    left: 100,
    width: 200,
    height: 500,
    overflow: "hidden",
} as const

const pageContainer = {
    display: "flex",
    flexDirection: "row",
    width: 180,
    height: 180,
    position: "relative",
    top: 300,
    left: 10,
} as const

const box = {
    background: "#ff0055",
}

const b = {
    ...box,
    top: 100,
    left: 100,
    width: "100%",
    height: 500,
    borderRadius: 10,
}

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

describe("Nested Scroll/Page", () => {
    it("correctly positions children after dragging", async () => {
        await visit(App)
        await wait(50)
        const a = query("#a")
        await should(() => {
            expectBbox(a, {
                top: 400,
                left: 110,
            })
        })
        await nextFrame()
        await nextFrame()
        trigger(a, "pointerdown", { x: 60, y: 60, force: true })
        trigger(a, "pointermove", { x: 50, y: 50, force: true }) // Gesture will start from first move past threshold
        await nextFrame()
        await wait(50)
        trigger(a, "pointermove", { x: 10, y: 10, force: true })
        await nextFrame()
        await wait(200)
        trigger(a, "pointerup")
        await wait(70)
        await should(() => {
            expectBbox(a, {
                top: 400,
                left: 50,
            })
        })
        trigger(query("#b"), "pointerdown", { x: 60, y: 60, force: true })
        await wait(50)
        await should(() => {
            expectBbox(query("#a"), {
                top: 400,
                left: 50,
            })
        })
    })
})
