/**
 * Port of upstream's `cypress/integration/animate-autoplay-false.ts` and its page,
 * `dev/react/src/tests/animate-autoplay-false.tsx`.
 */
import { createSignal, onSettled } from "solid-js"
import { animate } from "../../src"
import { query, should, visit, wait } from "./utils"

function App() {
    let ref!: HTMLDivElement
    const [opacity, setOpacity] = createSignal<string | null>(null)

    onSettled(() => {
        const animation = animate(
            ref,
            { opacity: 0.5 },
            { duration: 10, autoplay: false }
        )

        // Check opacity after a short delay to confirm it hasn't started
        const timer = setTimeout(() => {
            setOpacity(getComputedStyle(ref).opacity)
        }, 100)

        return () => {
            animation.stop()
            clearTimeout(timer)
        }
    })

    return (
        <>
            <div
                id="box"
                ref={ref}
                style={{
                    width: "100px",
                    height: "100px",
                    "background-color": "#fff",
                    opacity: 1,
                }}
            />
            <div id="opacity">{opacity()}</div>
        </>
    )
}

describe("animate() with autoplay: false", () => {
    it("does not start WAAPI animation when autoplay is false", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            // opacity should remain at 1 since autoplay is false
            const opacity = parseFloat(getComputedStyle(query("#box")).opacity)
            expect(opacity).toBe(1)
        })
    })
})
