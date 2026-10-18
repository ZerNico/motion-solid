/**
 * Port of upstream's `cypress/integration/animate-layout-timing.ts` and its page,
 * `dev/react/src/tests/animate-layout-timing.tsx`.
 */
import { createEffect, createSignal } from "solid-js"
import { animate, motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

function App() {
    const [count, setCount] = createSignal(0)
    const [result, setResult] = createSignal("")

    createEffect(count, (count) => {
        if (count % 2 === 0) return

        const output: number[] = []
        const controls = animate(0, 100, {
            duration: 0.5,
            ease: "linear",
            onUpdate: (v: number) => output.push(v),
            onComplete: () =>
                setResult(
                    output[1] !== 100 && output.length !== 2
                        ? "Success"
                        : "Fail"
                ),
        })
        return controls.stop
    })

    return (
        <section
            style={{
                position: "relative",
                display: "flex",
                "flex-direction": "column",
                padding: "100px",
            }}
        >
            <button id="action" onClick={() => setCount((c) => c + 1)}>
                Animate
            </button>
            <input id="result" readonly value={result()} />
            <motion.div
                layout
                style={{
                    width: "100px",
                    height: "100px",
                    backgroundColor: "red",
                }}
            />
        </section>
    )
}

describe("animate() x layout prop timing", () => {
    it("animate() plays as expected when layout prop is present", async () => {
        await visit(App)
        await wait(1000)
        trigger(query("#action"), "click", { x: 1, y: 1, force: true })
        await wait(600)
        await should(() => {
            expect(query<HTMLInputElement>("#result").value).toBe("Success")
        })
    })
})
