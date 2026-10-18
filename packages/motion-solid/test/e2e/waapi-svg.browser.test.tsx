/**
 * Port of upstream's `cypress/integration/waapi-svg.ts` and its page,
 * `dev/react/src/tests/waapi-svg.tsx`.
 *
 * Two complementary tests, each gated on Element.getAnimations() support:
 *
 * - Browsers without it (CI's Electron) run a behavioral check: when an
 *   animation is hardware-accelerated, Motion doesn't run its JS animation
 *   loop, so the values it renders per-frame (SVG attributes, inline styles)
 *   stay at their initial keyframe while the computed style animates. The JS
 *   fallback writes these values every frame, so asserting they're static
 *   mid-animation proves WAAPI is driving the animation.
 *
 * - Browsers with it verify WAAPI animations directly. (The behavioral check
 *   can't run there: Cypress's runner starves the AUT iframe of rendering
 *   frames in modern Chrome, so animation timelines barely advance.)
 */
import { motion } from "../../src"
import { query, should, visit, wait } from "./utils"

const transition = { type: "tween", ease: "linear", duration: 10 } as const

function App() {
    return (
        <section style={{ padding: "100px" }}>
            <svg width="400" height="200" viewBox="0 0 400 200">
                <motion.circle
                    id="circle"
                    cx={50}
                    cy={100}
                    r={40}
                    fill="#00f"
                    initial={{ opacity: 1, transform: "translateX(0px)" }}
                    animate={{
                        opacity: 0.2,
                        transform: "translateX(100px)",
                    }}
                    transition={transition}
                />
                <motion.rect
                    id="rect"
                    x={200}
                    y={60}
                    width={80}
                    height={80}
                    fill="#0f0"
                    initial={{ opacity: 1, transform: "scale(1)" }}
                    animate={{ opacity: 0.2, transform: "scale(1.5)" }}
                    transition={transition}
                />
            </svg>
            <motion.div
                id="control"
                initial={{ opacity: 1, transform: "translateX(0px)" }}
                animate={{ opacity: 0.2, transform: "translateX(100px)" }}
                transition={transition}
                style={{
                    width: 100,
                    height: 100,
                    backgroundColor: "red",
                }}
            />
        </section>
    )
}

const parseMatrix = (computedTransform: string) =>
    computedTransform
        .replace(/matrix\(|\)/g, "")
        .split(",")
        .map(parseFloat)

describe("waapi-svg", () => {
    it("Drives SVG opacity and transform animations with WAAPI, not per-frame renders", async (context) => {
        await visit(App)
        await wait(1000)
        const win: any = window
        if (win.Element.prototype.getAnimations) return context.skip()

        /**
         * Sanity check: the HTML control element is accelerated,
         * proving the WAAPI path works in this environment.
         */
        {
            const control = query("#control")
            const opacity = parseFloat(getComputedStyle(control).opacity)
            expect(opacity).toBeLessThan(0.97)
            expect(opacity).toBeGreaterThan(0.25)
            expect(control.style.opacity).toBe("1")
            expect(control.style.transform).toBe("translateX(0px)")
        }
        {
            const circle = query("#circle")
            const computed = getComputedStyle(circle)
            const opacity = parseFloat(computed.opacity)
            expect(opacity).toBeLessThan(0.97)
            expect(opacity).toBeGreaterThan(0.25)

            const [, , , , translateX] = parseMatrix(computed.transform)
            expect(translateX).toBeGreaterThan(3)

            // Per-frame rendered values remain at the initial keyframe
            expect(circle.style.opacity).toBe("1")
            expect(circle.style.transform).toBe("translateX(0px)")
        }
        {
            const rect = query("#rect")
            const computed = getComputedStyle(rect)
            const opacity = parseFloat(computed.opacity)
            expect(opacity).toBeLessThan(0.97)
            expect(opacity).toBeGreaterThan(0.25)

            const [scaleX] = parseMatrix(computed.transform)
            expect(scaleX).toBeGreaterThan(1.01)

            expect(rect.style.opacity).toBe("1")
            expect(rect.style.transform).toBe("scale(1)")
        }
    })

    it("Creates WAAPI animations on SVG elements (requires getAnimations support)", async (context) => {
        await visit(App)
        await wait(200)
        const win: any = window
        if (!win.Element.prototype.getAnimations) return context.skip()

        const getAnimatedProperties = (element: Element) =>
            element
                .getAnimations()
                .flatMap((animation) =>
                    Object.keys(
                        (
                            animation.effect as KeyframeEffect
                        ).getKeyframes()[0] ?? {}
                    )
                )

        // should() so we retry until the animations have been created
        await should(() => {
            const properties = getAnimatedProperties(query("#circle"))
            expect(properties).toContain("opacity")
            expect(properties).toContain("transform")
        })
        await should(() => {
            const properties = getAnimatedProperties(query("#rect"))
            expect(properties).toContain("opacity")
            expect(properties).toContain("transform")
        })
    })
})
