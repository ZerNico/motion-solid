/**
 * Port of upstream's `cypress/integration/scroll-target-transform.ts` and its page,
 * `dev/react/src/tests/scroll-target-transform.tsx`.
 */
import type { JSX } from "@solidjs/web"
import { createSignal } from "solid-js"
import { motion, useScroll, useTransform } from "../../src"
import { query, should, visit, wait } from "./utils"

function App() {
    const [target, setTarget] = createSignal<HTMLDivElement>()
    const { scrollYProgress } = useScroll({
        target,
        offset: ["start end", "end start"],
    })

    const opacity = useTransform(scrollYProgress, [0, 1], [1, 0])
    const y = useTransform(scrollYProgress, [0, 1], [0, -100])

    return (
        <>
            <div style={spacer} />
            <div ref={setTarget} style={targetStyle}>
                <motion.div
                    id="target"
                    style={{
                        width: 100,
                        height: 100,
                        background: "red",
                        opacity,
                        y,
                    }}
                />
            </div>
            <div style={spacer} />
            <div style={spacer} />
            <span id="has-accelerate">
                {scrollYProgress.accelerate ? "true" : "false"}
            </span>
        </>
    )
}

const spacer: JSX.CSSProperties = { height: "100vh" }
const targetStyle: JSX.CSSProperties = {
    height: "100vh",
    display: "flex",
    "align-items": "center",
    "justify-content": "center",
}

/**
 * `cy.scrollTo("bottom", { duration })`: scrolls the window there over `duration` ms.
 */
async function scrollToBottom(duration: number) {
    const from = window.scrollY
    const to = document.documentElement.scrollHeight - window.innerHeight
    const start = performance.now()
    await new Promise<void>((resolve) => {
        const step = () => {
            const progress = Math.min(1, (performance.now() - start) / duration)
            window.scrollTo(0, from + (to - from) * progress)
            if (progress < 1) requestAnimationFrame(step)
            else resolve()
        }
        requestAnimationFrame(step)
    })
}

describe("useScroll with target only sets accelerate with ViewTimeline", () => {
    it("Only sets accelerate when target is provided if ViewTimeline is supported", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            const expected = (window as any).ViewTimeline ? "true" : "false"
            expect(query("#has-accelerate").innerText).toBe(expected)
        })
    })

    it("Opacity updates via useTransform when scrolling", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            // Before scrolling, opacity should be near initial value
            const initialOpacity = parseFloat(
                getComputedStyle(query("#target")).opacity
            )
            expect(initialOpacity).toBeGreaterThan(0)
        })
        await scrollToBottom(300)
        await wait(200)
        await should(() => {
            // After scrolling, opacity should have changed
            const opacity = parseFloat(
                getComputedStyle(query("#target")).opacity
            )
            expect(opacity).toBeLessThan(1)
        })
    })
})
