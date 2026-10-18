/**
 * Port of upstream's `cypress/integration/svg-transform-animation.ts` and its page,
 * `dev/react/src/tests/svg-transform-animation.tsx`.
 */
import { createSignal } from "solid-js"
import { motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

/**
 * Test for issue #3081: SVG transform animations should work
 * even when other SVG attributes are not also animated.
 */
function App() {
    const [animate, setAnimate] = createSignal(false)

    return (
        <>
            <motion.svg
                id="svg-root"
                width={200}
                height={200}
                initial={animate() ? undefined : { rotate: 10 }}
                animate={animate() ? { rotate: 0 } : undefined}
                transition={{ duration: 0.1, ease: "linear" }}
            >
                <motion.g
                    id="svg-g"
                    transition={{ duration: 0.1, ease: "linear" }}
                    initial={
                        animate()
                            ? undefined
                            : {
                                  transform: "matrix(1,0,0,1, 50, 50)",
                                  stroke: "#ff0000",
                              }
                    }
                    animate={
                        animate()
                            ? {
                                  transform: "matrix(1, 0, 0, 1, 0, 0)",
                                  stroke: "#00ffff",
                              }
                            : undefined
                    }
                >
                    <motion.rect
                        id="svg-rect"
                        x={0}
                        y={0}
                        width={30}
                        height={30}
                        stroke-width="5px"
                        initial={
                            animate()
                                ? undefined
                                : {
                                      transform: "matrix(2,0,0,2, 0, 0)",
                                      fill: "#ffff00",
                                  }
                        }
                        animate={
                            animate()
                                ? {
                                      transform: "matrix(1, 0, 0, 1, 0, 0)",
                                      fill: "#ff00ff",
                                  }
                                : undefined
                        }
                        transition={{ duration: 0.1, ease: "linear" }}
                    />
                </motion.g>
            </motion.svg>
            <button id="animate" onClick={() => setAnimate(true)}>
                Animate
            </button>
        </>
    )
}

describe("SVG transform animation (#3081)", () => {
    it("Applies transform animation without other SVG attributes animated", async () => {
        await visit(App)
        await wait(50)
        await should(() => {
            const rect = query("#svg-rect")
            // Before animation, transform should be the initial matrix(2,0,0,2,0,0)
            expect(rect.style.transform).toContain("matrix")
        })
        trigger(query("#animate"), "click")
        await wait(300)
        await should(() => {
            const rect = query("#svg-rect")
            const transform = rect.style.transform
            // After animation, transform should be the final identity matrix
            expect(transform).not.toBe("")
            expect(transform).not.toBe("none")
            expect(transform).toContain("matrix")
            const match = transform.match(/matrix\(([^)]+)\)/)
            expect(match).not.toBeNull()
            const values = match![1].split(",").map(Number)
            // Identity matrix: 1, 0, 0, 1, 0, 0
            // (chai's `closeTo(1, 0.1)`)
            expect(Math.abs(values[0] - 1)).toBeLessThanOrEqual(0.1)
            expect(Math.abs(values[3] - 1)).toBeLessThanOrEqual(0.1)
        })
        await should(() => {
            const g = query("#svg-g")
            const transform = g.style.transform
            expect(transform).not.toBe("")
            expect(transform).not.toBe("none")
            expect(transform).toContain("matrix")
        })
        await should(() => {
            const svg = query("#svg-root")
            const transform = svg.style.transform
            // motion.svg treats transforms like HTML (rotate builds to "none" at 0deg)
            expect(transform).not.toBe("")
        })
    })
})
