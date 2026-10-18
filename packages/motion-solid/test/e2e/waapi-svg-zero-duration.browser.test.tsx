/**
 * Port of upstream's `cypress/integration/waapi-svg-zero-duration.ts` and its page,
 * `dev/react/src/tests/waapi-svg-zero-duration.tsx`.
 */
import { createSignal } from "solid-js"
import { motion } from "../../src"
import { nextFrame, query, should, trigger, visit } from "./utils"

function App() {
    const [hidden, setHidden] = createSignal(false)

    /**
     * Mark which animation last completed so the test can wait for it
     * rather than for a fixed delay, which flakes when frames are late.
     */
    const onComplete = (id: string) => () => {
        document.getElementById(id)!.dataset.complete = hidden()
            ? "hidden"
            : "visible"
    }

    return (
        <>
            <button id="toggle" onClick={() => setHidden(!hidden())}>
                toggle
            </button>
            <svg height={60} width={200}>
                <motion.foreignObject
                    id="chip"
                    animate={{ opacity: hidden() ? 0 : 1 }}
                    height={40}
                    initial={false}
                    onAnimationComplete={onComplete("chip")}
                    transition={
                        hidden()
                            ? { duration: 0.3 }
                            : { duration: 0.3, opacity: { duration: 0 } }
                    }
                    width={100}
                    x={10}
                    y={10}
                >
                    <div style={{ background: "red" }}>chip</div>
                </motion.foreignObject>
                <motion.rect
                    id="transform-target"
                    animate={{
                        transform: hidden()
                            ? "translateX(50px)"
                            : "translateX(0px)",
                    }}
                    height={40}
                    initial={false}
                    onAnimationComplete={onComplete("transform-target")}
                    transition={
                        hidden()
                            ? { duration: 0.3 }
                            : { duration: 0.3, transform: { duration: 0 } }
                    }
                    width={40}
                    x={120}
                    y={10}
                />
            </svg>
        </>
    )
}

/**
 * A zero-duration animation reports completion before the frame that
 * applies its value, so wait for that frame instead.
 */
describe("waapi-svg-zero-duration", () => {
    it("Restores SVG opacity with a zero-duration animation", async () => {
        await visit(App)
        trigger(query("#toggle"), "click")
        await should(() => query('#chip[data-complete="hidden"]'))
        expect(getComputedStyle(query("#chip")).opacity).toBe("0")
        trigger(query("#toggle"), "click")
        await nextFrame()
        expect(getComputedStyle(query("#chip")).opacity).toBe("1")
    })

    it("Restores SVG transform with a zero-duration animation", async () => {
        await visit(App)
        trigger(query("#toggle"), "click")
        await should(() => query('#transform-target[data-complete="hidden"]'))
        expect(query("#transform-target").style.transform).toBe(
            "translateX(50px)"
        )
        trigger(query("#toggle"), "click")
        await nextFrame()
        expect(query("#transform-target").style.transform).toBe(
            "translateX(0px)"
        )
    })
})
