/**
 * Port of upstream's `cypress/integration/animate-filter-blur.ts` and its page,
 * `dev/react/src/tests/animate-filter-blur.tsx`.
 */
import { createSignal, onSettled } from "solid-js"
import { animate } from "../../src"
import { query, should, visit } from "./utils"

/**
 * Test for #3102 — filter blur animation should work correctly.
 *
 * Tests valid filter blur animations and verifies that
 * re-animating (simulating HMR) works without issues.
 */
function App() {
    let ref!: HTMLDivElement
    const [done, setDone] = createSignal(false)
    const [reanimated, setReanimated] = createSignal(false)

    onSettled(() => {
        const el = ref

        // First animation: blur(10px) → blur(0px)
        const anim = animate(
            el,
            { filter: ["blur(10px)", "blur(0px)"] },
            { duration: 0.3 }
        )

        anim.then(() => {
            setDone(true)

            // Re-animate (simulates HMR re-triggering the animation)
            const anim2 = animate(
                el,
                { filter: ["blur(10px)", "blur(0px)"] },
                { duration: 0.3 }
            )

            anim2.then(() => setReanimated(true))
        })
    })

    return (
        <div>
            <div
                id="box"
                ref={ref}
                style={{ width: "100px", height: "100px", background: "red" }}
            />
            <p id="done">{String(done())}</p>
            <p id="reanimated">{String(reanimated())}</p>
        </div>
    )
}

describe("animate() filter blur (#3102)", () => {
    it("animates filter blur values correctly including re-animation", async () => {
        await visit(App)

        // First animation should complete
        await should(() => expect(query("#done").textContent).toContain("true"))

        // Re-animation should also complete
        await should(() =>
            expect(query("#reanimated").textContent).toContain("true")
        )

        // The box should have the correct final filter value
        await should(() => {
            const filter = getComputedStyle(query("#box")).filter
            // After blur(0px) animation, filter should be "none" or "blur(0px)"
            expect(filter === "none" || filter === "blur(0px)").toBe(true)
        })
    })
})
