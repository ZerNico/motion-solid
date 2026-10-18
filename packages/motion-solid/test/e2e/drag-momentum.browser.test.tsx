/**
 * Port of upstream's `cypress/integration/drag-momentum.ts` and its page,
 * `dev/react/src/tests/drag-momentum.tsx`.
 */
import { motion } from "../../src"
import { nextFrame, query, should, visit, wait } from "./utils"

function App() {
    return (
        <div style={{ height: "2000px", "padding-top": "100px" }}>
            <motion.div
                id="box"
                data-testid="draggable"
                drag
                dragMomentum={true}
                initial={{
                    width: 50,
                    height: 1000,
                    background: "red",
                    x: 0,
                    y: 0,
                }}
            />
        </div>
    )
}

/**
 * Release velocity only looks at the last 100ms of pointer history, and
 * PanSession applies each pointermove on the next animation frame. Separate
 * cy.trigger() calls can be >100ms apart on slow CI, so the throw is
 * dispatched directly: final pointermove, one frame, then pointerup.
 */
function dispatchPointer(el: HTMLElement, type: string, clientY: number) {
    el.dispatchEvent(
        new PointerEvent(type, {
            clientX: el.getBoundingClientRect().left + 25,
            clientY,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            bubbles: true,
            cancelable: true,
        })
    )
}

async function flick(el: HTMLElement, clientY: number) {
    dispatchPointer(el, "pointermove", clientY)
    await nextFrame()
    dispatchPointer(el, "pointerup", clientY)
}

const topOf = (el: HTMLElement) => el.getBoundingClientRect().top

const draggable = () => query("[data-testid='draggable']")

describe("Drag Momentum", () => {
    it("Fast flick after hold produces momentum", async () => {
        let startTop = 0
        await visit(App)
        await wait(200)
        const el = draggable()
        await wait(200)
        await nextFrame()
        await nextFrame()
        startTop = topOf(el)
        dispatchPointer(el, "pointerdown", startTop + 900)
        await wait(300) // Simulate holding before flick
        // Cross distance threshold
        dispatchPointer(el, "pointermove", startTop + 895)
        await nextFrame() // Start the pan before the flick
        await wait(50)
        await flick(el, startTop + 800) // Quick flick upward
        await wait(500) // Wait for momentum to carry element
        await should(() => {
            // Element should have carried well past the release point
            // due to momentum. Without the fix, velocity is diluted by
            // the stale pointer-down point and momentum is minimal.
            expect(topOf(el)).toBeLessThan(-200)
        })
    })

    it("Catch-and-release stops momentum", async () => {
        let startTop = 0
        let releasedTop = 0
        let caughtTop = 0
        await visit(App)
        await wait(200)
        const el = draggable()
        await wait(200)
        await nextFrame()
        await nextFrame()
        // Perform a drag-and-throw upward
        startTop = topOf(el)
        dispatchPointer(el, "pointerdown", startTop + 900)
        dispatchPointer(el, "pointermove", startTop + 895) // Cross distance threshold
        await nextFrame() // Start the pan before the flick
        await wait(50)
        await flick(el, startTop + 700)
        releasedTop = topOf(el)
        // Wait until momentum is visibly carrying the element, or the
        // catch is untested
        await should(() => {
            expect(releasedTop - topOf(el)).toBeGreaterThan(20)
        })
        // Catch. Pointerdown stops the animation, which renders its
        // final value on the next frame.
        dispatchPointer(el, "pointerdown", startTop + 500)
        await nextFrame()
        caughtTop = topOf(el)
        await wait(50)
        dispatchPointer(el, "pointerup", startTop + 500)
        await wait(500) // Wait to see if element continues moving
        await should(() => {
            // Element should stay near where it was caught,
            // not continue with old momentum.
            expect(Math.abs(topOf(el) - caughtTop)).toBeLessThan(50)
        })
    })
})
