/**
 * Port of upstream's `cypress/integration/animate-sequence-spring.ts` and its page,
 * `dev/react/src/tests/animate-sequence-spring.tsx`.
 */
import { createSignal, onSettled } from "solid-js"
import { useAnimate } from "../../src"
import { query, should, visit, wait } from "./utils"

/**
 * Reproduction for #3158: spring animations with animation sequences
 * should not throw "Only two keyframes currently supported with spring
 * and inertia animations".
 */
function App() {
    const [scope, animate] = useAnimate()
    const [result, setResult] = createSignal("")

    onSettled(() => {
        animate(
            [
                ["#box-a", { x: [0, 20], y: [0, 20] }],
                ["#box-b", { scale: [1, 2] }],
            ],
            { defaultTransition: { type: "spring" } }
        )
            .then(() => setResult("Success"))
            .catch(() => setResult("Error"))
    })

    return (
        <div ref={scope} style={{ padding: "100px" }}>
            <div
                id="box-a"
                style={{
                    width: "100px",
                    height: "100px",
                    "background-color": "red",
                }}
            />
            <div
                id="box-b"
                style={{
                    width: "100px",
                    height: "100px",
                    "background-color": "blue",
                }}
            />
            <input id="result" readonly value={result()} />
        </div>
    )
}

describe("animate() sequence with spring defaultTransition (#3158)", () => {
    it("does not throw when using type: spring with 2-keyframe sequence segments", async () => {
        await visit(App)
        await wait(2000)
        await should(() => {
            expect(query<HTMLInputElement>("#result").value).toBe("Success")
        })
    })
})
