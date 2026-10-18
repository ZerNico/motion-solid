/**
 * Port of upstream's `cypress/integration/animate-unit-types.ts` and its pages,
 * `dev/react/src/tests/animate-height.tsx` and `animate-x-percent.tsx`.
 */
import { createSignal } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, visit, wait } from "./utils"

function AnimateHeight() {
    const output: Array<string | number> = []
    let ref!: HTMLDivElement
    const [state, setState] = createSignal(true)

    return (
        <div style={{ height: "100px", width: "100px", display: "flex" }}>
            <AnimatePresence>
                <Show when={state()}>
                    <motion.div
                        id="test"
                        ref={ref}
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        style={{ width: 100, background: "red" }}
                        transition={{ duration: 0.1 }}
                        onUpdate={({ height }) => {
                            output.push(height as string | number)
                        }}
                        onAnimationComplete={() => {
                            // Didn't animate properly
                            if (output.length === 1) {
                                ref.innerHTML = "Error"
                            }

                            // Didn't apply "auto" as final style
                            requestAnimationFrame(() => {
                                if (ref?.style.height !== "auto") {
                                    ref.innerHTML = "Error"
                                }
                            })
                        }}
                        onClick={() => setState(false)}
                    />
                </Show>
            </AnimatePresence>
        </div>
    )
}

function AnimateXPercent() {
    const output: Array<string | number> = []
    let ref!: HTMLDivElement
    const [state, setState] = createSignal(true)

    return (
        <div style={{ height: "100px", width: "200px", display: "flex" }}>
            <AnimatePresence>
                <Show when={state()}>
                    <motion.div
                        id="test"
                        ref={ref}
                        animate={{ x: "100%", y: "100%", rotate: "-30deg" }}
                        style={{ width: 200, background: "red" }}
                        onClick={() => setState(false)}
                        transition={{ duration: 2 }}
                        onUpdate={({ x }) => {
                            output.push(x as string | number)
                        }}
                        onAnimationComplete={() => {
                            if (output[0] === "100%") {
                                ref.innerHTML = "Error"
                            }
                        }}
                    />
                </Show>
            </AnimatePresence>
        </div>
    )
}

describe("Unit conversion", () => {
    it("animates height: auto correctly", async () => {
        await visit(AnimateHeight)
        await wait(200)
        await should(() => {
            expect(query("#test").innerText).not.toBe("Error")
        })
    })

    it("animates translation from px to percent", async () => {
        await visit(AnimateXPercent)
        await wait(200)
        await should(() => {
            expect(query("#test").innerText).not.toBe("Error")
        })
    })
})
