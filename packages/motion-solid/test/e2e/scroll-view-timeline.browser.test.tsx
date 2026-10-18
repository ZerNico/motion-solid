/**
 * Port of upstream's `cypress/integration/scroll-view-timeline.ts` and its page,
 * `dev/react/src/tests/scroll-view-timeline.tsx`.
 */
import type { JSX } from "@solidjs/web"
import { createSignal } from "solid-js"
import { motion, useScroll, useTransform } from "../../src"
import { query, should, visit, wait } from "./utils"

const box = {
    width: 100,
    height: 100,
    background: "red",
} as const

/**
 * Default offset (All preset)
 */
function DefaultTarget() {
    const [ref, setRef] = createSignal<HTMLDivElement>()
    const { scrollYProgress } = useScroll({ target: ref })
    const opacity = useTransform(scrollYProgress, [0, 1], [1, 0])
    return (
        <div ref={setRef} style={targetStyle}>
            <motion.div id="default-target" style={{ ...box, opacity }} />
            <span id="default-accelerate">
                {scrollYProgress.accelerate ? "true" : "false"}
            </span>
        </div>
    )
}

/**
 * Enter preset offset — [[0,1],[1,1]]
 */
function EnterTarget() {
    const [ref, setRef] = createSignal<HTMLDivElement>()
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: [
            [0, 1],
            [1, 1],
        ],
    })
    const opacity = useTransform(scrollYProgress, [0, 1], [0, 1])
    return (
        <div ref={setRef} style={targetStyle}>
            <motion.div id="enter-target" style={{ ...box, opacity }} />
            <span id="enter-accelerate">
                {scrollYProgress.accelerate ? "true" : "false"}
            </span>
        </div>
    )
}

/**
 * String offset - maps to the cover range
 */
function StringOffsetTarget() {
    const [ref, setRef] = createSignal<HTMLDivElement>()
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    })
    const opacity = useTransform(scrollYProgress, [0, 1], [1, 0])
    return (
        <div ref={setRef} style={targetStyle}>
            <motion.div id="string-target" style={{ ...box, opacity }} />
            <span id="string-accelerate">
                {scrollYProgress.accelerate ? "true" : "false"}
            </span>
        </div>
    )
}

function App() {
    return (
        <>
            <div style={spacer} />
            <DefaultTarget />
            <div style={spacer} />
            <EnterTarget />
            <div style={spacer} />
            <StringOffsetTarget />
            <div style={spacer} />
        </>
    )
}

const spacer: JSX.CSSProperties = { height: "100vh" }
const targetStyle: JSX.CSSProperties = {
    height: "100vh",
    display: "flex",
    "align-items": "center",
    "justify-content": "center",
    "flex-direction": "column",
}

describe("scroll ViewTimeline acceleration", () => {
    it("Accelerates target with default offset when ViewTimeline supported", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            const expected = (window as any).ViewTimeline ? "true" : "false"
            expect(query("#default-accelerate").innerText).toBe(expected)
        })
    })

    it("Accelerates target with Enter preset offset when ViewTimeline supported", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            const expected = (window as any).ViewTimeline ? "true" : "false"
            expect(query("#enter-accelerate").innerText).toBe(expected)
        })
    })

    it("Accelerates target with cover string offset when ViewTimeline supported", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            const expected = (window as any).ViewTimeline ? "true" : "false"
            expect(query("#string-accelerate").innerText).toBe(expected)
        })
    })
})
