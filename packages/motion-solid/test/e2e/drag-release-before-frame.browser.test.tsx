/**
 * Port of upstream's `cypress/integration/drag-release-before-frame.ts` and its page,
 * `dev/react/src/tests/drag-release-before-frame.tsx`.
 */
import { createSignal } from "solid-js"
import { motion } from "../../src"
import { nextFrame, query, should, visit } from "./utils"

/**
 * Browsers flush a pending (coalesced) pointermove right before pointerup,
 * so the final move and the release often arrive within the same frame.
 * The element should come to rest at the release point, matching the
 * offset reported to onDragEnd.
 */
function App() {
    const [offset, setOffset] = createSignal("")

    return (
        <div style={{ padding: "100px" }}>
            <motion.div
                data-testid="draggable"
                drag
                dragElastic={0}
                dragMomentum={false}
                onDragEnd={(_, info) =>
                    setOffset(`${info.offset.x},${info.offset.y}`)
                }
                style={{ width: 50, height: 50, background: "red" }}
            />
            <div id="drag-end-offset">{offset()}</div>
        </div>
    )
}

function pointer(el: Element, type: string, x: number, y: number) {
    const win = el.ownerDocument.defaultView as any
    el.dispatchEvent(
        new win.PointerEvent(type, {
            clientX: x,
            clientY: y,
            isPrimary: true,
            bubbles: true,
            pointerId: 1,
            button: 0,
            pointerType: "mouse",
        })
    )
}

async function startDrag() {
    let start!: DOMRect

    await visit(App)
    const el = query("[data-testid='draggable']")
    /**
     * Wait for React 19 StrictMode's post-paint remount, which would
     * otherwise end a gesture started on the first frame.
     */
    await nextFrame()
    await nextFrame()
    start = el.getBoundingClientRect()
    pointer(el, "pointerdown", start.left + 5, start.top + 5)
    pointer(el, "pointermove", start.left + 15, start.top + 15)
    await nextFrame()
    await nextFrame()
    const { left, top } = el.getBoundingClientRect()
    expect(left - start.left, "x offset after first move").toBe(10)
    expect(top - start.top, "y offset after first move").toBe(10)

    return () => start
}

async function expectRestingAt(getStart: () => DOMRect, x: number, y: number) {
    await nextFrame()
    await nextFrame()
    await should(() =>
        expect(query("#drag-end-offset").textContent).toBe(`${x},${y}`)
    )
    const el = query("[data-testid='draggable']")
    const start = getStart()
    const { left, top } = el.getBoundingClientRect()
    expect(left - start.left, "x offset at rest").toBe(x)
    expect(top - start.top, "y offset at rest").toBe(y)
}

describe("Drag release before the next frame", () => {
    it("Applies a pointermove followed by pointerup within the same frame", async () => {
        const getStart = await startDrag()

        const el = query("[data-testid='draggable']")
        const start = getStart()
        pointer(el, "pointermove", start.left + 105, start.top + 105)
        pointer(el, "pointerup", start.left + 105, start.top + 105)

        await expectRestingAt(getStart, 100, 100)
    })

    it("Applies a pointermove when a frame runs before pointerup", async () => {
        const getStart = await startDrag()

        const el = query("[data-testid='draggable']")
        const start = getStart()
        pointer(el, "pointermove", start.left + 105, start.top + 105)
        await nextFrame()
        pointer(el, "pointerup", start.left + 105, start.top + 105)

        await expectRestingAt(getStart, 100, 100)
    })
})
