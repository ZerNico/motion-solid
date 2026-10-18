/**
 * Port of upstream's `cypress/integration/scroll-accelerate.ts` and its page,
 * `dev/react/src/tests/scroll-accelerate.tsx`.
 */
import type { JSX } from "@solidjs/web"
import { motion, useScroll, useTransform } from "../../src"
import { query, should, visit, wait } from "./utils"

const spacer: JSX.CSSProperties = { height: "100vh" }
const box = {
    position: "fixed",
    top: 0,
    left: 0,
    width: 100,
    height: 100,
} as const

function App() {
    const { scrollYProgress } = useScroll()
    const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0])
    const backgroundColor = useTransform(
        scrollYProgress,
        [0, 1],
        ["#ff0000", "#0000ff"]
    )

    const intermediate = useTransform(scrollYProgress, [0, 1], [1, 0.5])
    const chainedOpacity = useTransform(intermediate, [1, 0.75], [0, 1])

    return (
        <>
            <div style={spacer} />
            <div style={spacer} />
            <div style={spacer} />
            <div style={spacer} />
            <motion.div
                id="direct"
                style={{ ...box, opacity, backgroundColor }}
            />
            <motion.div
                id="chained"
                style={{ ...box, opacity: chainedOpacity, top: 110 }}
            />
            <span id="direct-accelerated">
                {opacity.accelerate ? "true" : "false"}
            </span>
            <span id="chained-accelerated">
                {chainedOpacity.accelerate ? "true" : "false"}
            </span>
            <span id="bg-accelerated">
                {backgroundColor.accelerate ? "true" : "false"}
            </span>
        </>
    )
}

describe("scroll timeline WAAPI acceleration", () => {
    it("Propagates acceleration for direct useTransform from scroll", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            const expected = (window as any).ScrollTimeline ? "true" : "false"
            expect(query("#direct-accelerated").innerText).toBe(expected)
        })
    })

    it("Propagates acceleration for non-acceleratable properties too", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            // backgroundColor gets accelerate config propagated,
            // but VisualElement skips WAAPI creation since it's
            // not in the acceleratedValues set
            const expected = (window as any).ScrollTimeline ? "true" : "false"
            expect(query("#bg-accelerated").innerText).toBe(expected)
        })
    })

    it("Does not propagate acceleration for chained useTransform", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            expect(query("#chained-accelerated").innerText).toBe("false")
        })
    })
})
