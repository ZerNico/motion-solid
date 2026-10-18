/**
 * Port of upstream's `cypress/integration/oklch-color-animation.ts` and its page,
 * `dev/react/src/tests/oklch-color-animation.tsx`.
 */
import { createSignal } from "solid-js"
import { motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

function supportsOklch() {
    const el = document.createElement("div")
    el.style.backgroundColor = "oklch(0.5 0.1 200)"
    return el.style.backgroundColor !== ""
}

function App() {
    const [isActive, setIsActive] = createSignal(false)
    const [result, setResult] = createSignal("")

    return (
        <div style={{ padding: "20px" }}>
            <button id="toggle" onClick={() => setIsActive(!isActive())}>
                Toggle color
            </button>
            <motion.div
                id="box"
                animate={{
                    backgroundColor: isActive()
                        ? "oklch(0.65 0.18 260)"
                        : "#ffffff",
                }}
                transition={{
                    type: "tween",
                    ease: "linear",
                    duration: 0.5,
                }}
                onAnimationComplete={() => {
                    const el = document.getElementById("box")
                    if (el) {
                        setResult(
                            JSON.stringify({
                                computed: getComputedStyle(el).backgroundColor,
                                supportsOklch: supportsOklch(),
                            })
                        )
                    }
                }}
                style={{
                    width: 100,
                    height: 100,
                    backgroundColor: "#ffffff",
                }}
            />
            <div id="result">{result()}</div>
        </div>
    )
}

describe("oklch color animation", () => {
    /**
     * Port note: fails, like upstream itself in a browser that supports oklch (checked with
     * motion/react 14.0.0 in Chromium, same page). `onAnimationComplete` also fires for the
     * mount animation (`animateVisualElement` notifies after `Promise.all([])` even though the
     * value is already at `#ffffff`), so `#result` already holds `rgb(255, 255, 255)` when the
     * toggle is clicked and the retried "not empty" check passes right away. Also, modern
     * Chromium reports the final computed color as `oklch(0.65 0.18 260)`, not `rgb(…)`.
     * Upstream only passes in Cypress' Electron, which lacks oklch (the `else` branch). Not a
     * motion-solid difference; see the next test for the actual behaviour.
     */
    it.fails("animates to the correct oklch target color", async () => {
        await visit(App)
        await wait(200)
        trigger(query("#toggle"), "click")
        await should(() => expect(query("#result").textContent).not.toBe(""))

        const data = JSON.parse(query("#result").textContent!)

        if (data.supportsOklch) {
            /**
             * In browsers that support oklch (Chrome, Firefox, Safari),
             * the computed style should be the oklch color resolved to
             * rgb. oklch(0.65 0.18 260) ≈ rgb(71, 150, 210).
             */
            const match = data.computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
            expect(match).not.toBeNull()
            const [, r, g, b] = match!
            expect(Number(r)).toBeLessThan(120)
            expect(Number(g)).toBeGreaterThan(100)
            expect(Number(b)).toBeGreaterThan(180)
        } else {
            /**
             * In browsers that don't support oklch (e.g. Electron),
             * verify the animation completed without crashing.
             * The unit tests for supportsBrowserAnimation are the
             * primary regression gate for this fix.
             */
            expect(data.computed).toMatch(/^rgb/)
        }
    })

    // Port note: not upstream. Waits for the toggle's animation to complete, and accepts the
    // computed color in oklch or rgb.
    it("animates to the correct oklch target color (after the toggle completes)", async () => {
        await visit(App)
        await wait(200)
        trigger(query("#toggle"), "click")
        await should(() =>
            expect(query("#result").textContent).not.toContain("255, 255, 255")
        )
        const data = JSON.parse(query("#result").textContent!)
        expect(data.supportsOklch).toBe(true)
        const rgb = data.computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        if (rgb) {
            const [, r, g, b] = rgb
            expect(Number(r)).toBeLessThan(120)
            expect(Number(g)).toBeGreaterThan(100)
            expect(Number(b)).toBeGreaterThan(180)
        } else {
            expect(data.computed).toBe("oklch(0.65 0.18 260)")
        }
    })
})
