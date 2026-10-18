/**
 * Port of upstream's `cypress/integration/animate-reverse.ts` and its page,
 * `dev/react/src/tests/animate-reverse.tsx`.
 */
import { createEffect, createSignal } from "solid-js"
import { animate, motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const containerStyles = {
    position: "relative",
    display: "flex",
    "flex-direction": "column",
    padding: "100px",
} as const

const boxStyles = {
    width: "100px",
    height: "100px",
    backgroundColor: "red",
}

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
            onComplete: () => {
                setResult(
                    output[0] === 100 && output.length !== 2
                        ? "Success"
                        : "Fail"
                )
            },
        })
        controls.time = controls.duration
        controls.speed = -1

        return controls.stop
    })

    return (
        <div style={containerStyles}>
            <button id="action" onClick={() => setCount((c) => c + 1)}>
                Animate
            </button>
            <input id="result" readonly value={result()} />
            {/*
             * Port note: upstream's click re-renders this `layout` div, whose
             * `root.didUpdate()` flushes the frame with the same `time.now()` `animate()`
             * started at, so the reversed animation's first `onUpdate` is exactly 100.
             * `layoutDependency` stands in for that re-render (see PORTING.md, layout).
             */}
            <motion.div
                class="box"
                layout
                layoutDependency={count()}
                style={boxStyles}
            />
        </div>
    )
}

describe("animate() x layout prop in reverse speed", () => {
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
