/**
 * Port of upstream's `cypress/integration/layout-read-transform.ts` and its page,
 * `dev/react/src/tests/layout-read-transform.tsx`.
 */
import { createEffect, createSignal } from "solid-js"
import { motion, Show } from "../../src"
import { expectBbox, query, should, visit, wait } from "./utils"

function App() {
    const [step, setStep] = createSignal(0)

    createEffect(
        () => step(),
        (step) => {
            if (step < 2) {
                const timeout = setTimeout(() => setStep(step + 1), 100)

                return () => clearTimeout(timeout)
            }
        }
    )

    // Port note: React's `key` swap → a keyed `Show`.
    return (
        <Show when={step() === 0 ? "0" : "1"} keyed>
            {(_key) => (
                <motion.div
                    id="box"
                    layoutId="box"
                    // Animate up to scale: 2 for step 1, then back to default
                    // scale for step 2. If the box ends animating to scale: 0.5,
                    // it means we erroneously read the initial transform from the
                    // layout animation.
                    animate={step() === 1 ? { scale: 2 } : {}}
                    transition={{ duration: 0.05 }}
                    style={{
                        background: "red",
                        width: step() === 0 ? 100 : 200,
                        height: step() === 0 ? 100 : 200,
                    }}
                />
            )}
        </Show>
    )
}

describe("Read initial transform during layout animation", () => {
    it("Should not read a projection transform as the initial transform", async () => {
        await visit(App)
        await wait(400)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 200,
                height: 200,
            })
        )
    })
})
