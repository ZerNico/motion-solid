/**
 * Port of upstream's `cypress/integration/drag-snap-to-cursor-initial.ts` and its page,
 * `dev/react/src/tests/drag-snap-to-cursor-initial.tsx`.
 */
import { createSignal } from "solid-js"
import { motion, useDragControls } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * An element with initial x/y offsets, dragged via useDragControls with
 * snapToCursor. Every drag start should centre the element under the pointer.
 *
 * With `?rerender=true`, each drag end triggers a React re-render, which
 * re-measures the element's layout.
 */
function App(props: { rerender?: string }) {
    const controls = useDragControls()
    const [dragCount, setDragCount] = createSignal(0)
    const rerender = props.rerender === "true"

    return (
        <>
            <div
                id="trigger"
                data-drag-count={dragCount()}
                onPointerDown={(event) =>
                    controls.start(event, { snapToCursor: true })
                }
                style={{
                    position: "absolute",
                    top: "0px",
                    left: "0px",
                    width: "400px",
                    height: "400px",
                    background: "#eee",
                }}
            />
            <motion.div
                id="box"
                /**
                 * Port note: a Solid component doesn't re-render. Upstream's re-render passes the
                 * `motion.div` new props; this prop change is the closest equivalent.
                 */
                data-drag-count={rerender ? dragCount() : undefined}
                drag
                dragControls={controls}
                dragListener={false}
                dragMomentum={false}
                initial={{ x: 100, y: 40 }}
                onDragEnd={
                    rerender ? () => setDragCount((c) => c + 1) : undefined
                }
                style={{
                    position: "absolute",
                    top: 0,
                    left: 500,
                    width: 100,
                    height: 100,
                    background: "red",
                }}
            />
        </>
    )
}

function expectBoxCenteredAt(x: number, y: number) {
    const { left, top, width, height } = query("#box").getBoundingClientRect()
    expect(Math.abs(left + width / 2 - x)).toBeLessThanOrEqual(1)
    expect(Math.abs(top + height / 2 - y)).toBeLessThanOrEqual(1)
}

async function snapAndDrag() {
    const triggerElement = query("#trigger")
    trigger(triggerElement, "pointerdown", { x: 50, y: 50 })
    await nextFrame()
    await wait(50)
    expectBoxCenteredAt(50, 50)

    trigger(triggerElement, "pointermove", { x: 60, y: 60, force: true })
    await nextFrame()
    await wait(50)
    trigger(triggerElement, "pointermove", { x: 200, y: 100, force: true })
    await nextFrame()
    await wait(50)
    expectBoxCenteredAt(200, 100)

    trigger(triggerElement, "pointerup", { x: 200, y: 100, force: true })
    await wait(50)
    expectBoxCenteredAt(200, 100)
}

describe("snapToCursor with initial coordinates", () => {
    it("centres the element under the pointer on every drag start", async () => {
        await visit(App)
        await wait(200)
        await nextFrame()
        await nextFrame()
        expectBoxCenteredAt(650, 90)

        await snapAndDrag()
        await snapAndDrag()
        await snapAndDrag()
    })

    it("centres the element under the pointer after re-renders", async () => {
        await visit(App, { rerender: "true" })
        await wait(200)
        await nextFrame()
        await nextFrame()
        expectBoxCenteredAt(650, 90)

        await snapAndDrag()
        await should(() =>
            expect(query("#trigger").getAttribute("data-drag-count")).toBe("1")
        )
        await snapAndDrag()
        await should(() =>
            expect(query("#trigger").getAttribute("data-drag-count")).toBe("2")
        )
        await snapAndDrag()
    })
})
