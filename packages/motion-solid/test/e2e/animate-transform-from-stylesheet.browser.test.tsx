/**
 * Port of upstream's `cypress/integration/animate-transform-from-stylesheet.ts` and its page,
 * `dev/react/src/tests/animate-transform-from-stylesheet.tsx`.
 */
import { onSettled } from "solid-js"
import { animate } from "../../src"
import { query, visit, wait } from "./utils"

function App() {
    let ref!: HTMLDivElement

    onSettled(() => {
        const animation = animate(
            ref,
            { x: 200 },
            { duration: 10, ease: "linear" }
        )
        return () => animation.stop()
    })

    return (
        <>
            <style>{`#box { transform: translateX(100px); }`}</style>
            <div id="box" ref={ref} style={{ width: "10px", height: "10px" }} />
        </>
    )
}

describe("Independent transforms", () => {
    it("animate from a stylesheet transform", async () => {
        await visit(App)
        await wait(5000)
        const element = query("#box")
        const { m41 } = new DOMMatrix(getComputedStyle(element).transform)
        expect(m41).toBeGreaterThanOrEqual(135)
        expect(m41).toBeLessThanOrEqual(165)
    }, 15000)
})
