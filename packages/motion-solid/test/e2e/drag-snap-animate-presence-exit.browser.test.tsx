/**
 * Port of upstream's `cypress/integration/drag-snap-animate-presence-exit.ts` and its page,
 * `dev/react/src/tests/drag-snap-animate-presence-exit.tsx`.
 */
import { createSignal } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { nextFrame, query, should, trigger, visit, wait } from "./utils"

/**
 * Companion to the #3315 fix: exercise drag + dragSnapToOrigin alongside
 * AnimatePresence exit. The fix removes a synchronous `value.stop()` from
 * VisualElement.unmount and relies on a deferred auto-stop — this page
 * lets a Cypress run prove that AnimatePresence exit animations still
 * complete cleanly while a drag-driven motion-value animation is mid-flight
 * during the unmount.
 */
const TILE_SIZE = 80

function App() {
    const [show, setShow] = createSignal(true)

    return (
        <div style={{ padding: "60px" }}>
            <button
                data-testid="toggle"
                onClick={() => setShow((s) => !s)}
                style={{ "margin-bottom": "20px" }}
            >
                toggle
            </button>
            <div
                id="container"
                data-show={show() ? "1" : "0"}
                style={{
                    position: "relative",
                    width: "300px",
                    height: "300px",
                }}
            >
                <AnimatePresence>
                    <Show when={show()}>
                        <motion.div
                            data-testid="tile"
                            drag
                            dragSnapToOrigin
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: TILE_SIZE,
                                height: TILE_SIZE,
                                background: "#08f",
                            }}
                        />
                    </Show>
                </AnimatePresence>
            </div>
        </div>
    )
}

/**
 * Cypress' `.click()`: the pointer and mouse events of a click at the element's center.
 */
function click(element: Element) {
    trigger(element, "pointerdown")
    trigger(element, "mousedown")
    trigger(element, "pointerup")
    trigger(element, "mouseup")
    trigger(element, "click")
}

/**
 * Drag + dragSnapToOrigin + AnimatePresence exit interaction (companion
 * to #3315). After the fix removed VE.unmount's synchronous value.stop(),
 * we want to confirm that:
 *   1. AnimatePresence exit animations still complete and tear the tile down.
 *   2. Toggling the tile back on after a drag yields a clean motion element
 *      (no stranded drag transform from the previous instance).
 */
describe("drag + dragSnapToOrigin + AnimatePresence exit", () => {
    it("exits cleanly after a drag and re-enters without a stranded transform", async () => {
        const initial: { left?: number; top?: number } = {}
        await visit(App)
        await wait(200)
        // Capture the tile's initial layout box so we can compare the
        // re-entered instance to it later.
        const r = query('[data-testid="tile"]').getBoundingClientRect()
        initial.left = r.left
        initial.top = r.top

        // Drag the tile and release — dragSnapToOrigin animation kicks in.
        const tile = query('[data-testid="tile"]')
        await nextFrame()
        await nextFrame()
        trigger(tile, "pointerdown", { x: 10, y: 10, force: true })
        trigger(tile, "pointermove", { x: 20, y: 10, force: true })
        await nextFrame()
        await wait(50)
        trigger(tile, "pointermove", { x: 60, y: 10, force: true })
        await nextFrame()
        await wait(50)
        trigger(tile, "pointerup", { x: 60, y: 10, force: true })

        // Toggle off mid-snap to trigger AnimatePresence exit while
        // the drag motion-value animation is still in flight.
        click(query('[data-testid="toggle"]'))
        await wait(800)
        // AnimatePresence should have torn the tile down.
        await should(() =>
            expect(document.querySelector('[data-testid="tile"]')).toBeNull()
        )

        // Toggle back on and confirm the new tile renders at the
        // same layout position as the first instance — no leftover
        // transform from the previous drag.
        click(query('[data-testid="toggle"]'))
        await wait(500)
        await should(() => {
            const r = query('[data-testid="tile"]').getBoundingClientRect()
            expect(Math.abs(r.left - initial.left!)).toBeLessThanOrEqual(2)
            expect(Math.abs(r.top - initial.top!)).toBeLessThanOrEqual(2)
        })
    })
})
