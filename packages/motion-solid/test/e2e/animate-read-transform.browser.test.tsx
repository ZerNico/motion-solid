/**
 * Port of upstream's `cypress/integration/animate-read-transform.ts` and its page,
 * `dev/react/src/tests/animate-read-transform.tsx`.
 */
import { onSettled } from "solid-js"
import { animate, pipe } from "../../src"
import { query, should, visit, wait } from "./utils"

function testAnimation(selector: string, values: any) {
    const element = document.querySelector(selector)
    if (!element) return () => {}

    const animation = animate(element, values, { duration: 1, ease: "linear" })
    animation.time = 0.5
    animation.pause()

    return () => animation.cancel()
}

const box = {
    width: "100px",
    height: "100px",
    background: "red",
}

function App() {
    onSettled(() => {
        return pipe(
            testAnimation(".translate", { x: 200, y: 200 }),
            testAnimation(".rotate", { rotate: 100 }),
            testAnimation(".scale", { scale: 4 })
        ) as () => void
    })

    return (
        <div>
            <div
                style={{ ...box, transform: "translate(100px, 100px)" }}
                class="translate"
            />
            <div
                style={{ ...box, transform: "rotate(90deg)" }}
                class="rotate"
            />
            <div style={{ ...box, transform: "scale(2)" }} class="scale" />
        </div>
    )
}

describe("animate() x read transform value", () => {
    it("correctly reads and animates transform values", async () => {
        await visit(App)
        await wait(500)
        await should(() => {
            const transform = query(".translate").style.transform
            expect(transform).toContain("translateX(150px)")
        })

        await should(() => {
            const transform = query(".rotate").style.transform
            expect(transform).toContain("rotate(95deg)")
        })

        await should(() => {
            const transform = query(".scale").style.transform
            expect(transform).toContain("scale(3)")
        })
    })
})
