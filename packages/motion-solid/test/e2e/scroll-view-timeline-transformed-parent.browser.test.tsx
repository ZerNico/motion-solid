/**
 * Port of upstream's `cypress/integration/scroll-view-timeline-transformed-parent.ts` and its
 * page, `dev/react/src/tests/scroll-view-timeline-transformed-parent.tsx`.
 *
 * Regression for #3658: nested motion components inside a useScroll target bind to
 * ScrollTimeline (cover defaults) instead of ViewTimeline. The ViewTimeline assertion only runs
 * in browsers that support ViewTimeline.
 */
import type { JSX } from "@solidjs/web"
import { createSignal, For, onSettled } from "solid-js"
import {
    motion,
    scroll,
    useScroll,
    useTransform,
    type MotionValue,
} from "../../src"
import { query, visit, wait } from "./utils"

const heroStyle: JSX.CSSProperties = {
    height: "100vh",
    display: "grid",
    "place-items": "center",
}

function FullRangeProbe(props: { progress: MotionValue<number> }) {
    // eslint-disable-next-line solid/reactivity
    const opacity = useTransform(props.progress, [0, 1], [0, 1])
    return (
        <motion.div
            id="opacity-probe"
            style={{
                width: 40,
                height: 40,
                background: "magenta",
                opacity,
            }}
        />
    )
}

function Word(props: {
    word: string
    index: number
    count: number
    progress: MotionValue<number>
}) {
    const start = props.index / props.count
    const end = start + 1 / props.count
    // eslint-disable-next-line solid/reactivity
    const opacity = useTransform(props.progress, [start, end], [0.2, 1])
    return (
        <motion.span style={{ opacity, color: "cyan" }}>
            {props.word}
        </motion.span>
    )
}

function TextReveal(props: { text: string }) {
    const [ref, setRef] = createSignal<HTMLDivElement>()
    let jsRef: HTMLSpanElement | undefined
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"],
    })

    onSettled(() => {
        const target = ref()
        if (!target) return
        // Callbacks always use the JS scrollInfo path.
        return scroll(
            (_progress: number, info) => {
                if (jsRef) jsRef.innerText = info.y.progress.toFixed(4)
            },
            {
                target,
                offset: ["start start", "end end"],
            }
        )
    })

    // eslint-disable-next-line solid/reactivity
    const words = props.text.split(" ")
    return (
        <div ref={setRef} style={{ position: "relative", height: "200vh" }}>
            <div
                style={{
                    position: "sticky",
                    top: "0px",
                    height: "50%",
                    display: "flex",
                    "align-items": "center",
                    "flex-direction": "column",
                    gap: "16px",
                }}
            >
                <div
                    style={{
                        "font-family": "monospace",
                        "font-size": "18px",
                    }}
                >
                    js:{" "}
                    <span id="js-progress" ref={jsRef}>
                        0
                    </span>
                </div>
                <FullRangeProbe progress={scrollYProgress} />
                <p
                    style={{
                        display: "flex",
                        "flex-wrap": "wrap",
                        gap: "8px",
                        "font-size": "32px",
                    }}
                >
                    <For each={words}>
                        {(word, i) => (
                            <Word
                                word={word}
                                index={i()}
                                count={words.length}
                                progress={scrollYProgress}
                            />
                        )}
                    </For>
                </p>
            </div>
        </div>
    )
}

function ClipReveal(props: { children: JSX.Element }) {
    const [ref, setRef] = createSignal<HTMLDivElement>()
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "start 0.3"],
    })
    const clipPath = useTransform(
        scrollYProgress,
        [0, 1],
        ["inset(8% 12% round 24px)", "inset(0% 0% round 0px)"]
    )
    const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1])

    return (
        <div ref={setRef}>
            <motion.div style={{ clipPath, scale }}>
                {props.children}
            </motion.div>
        </div>
    )
}

function App() {
    return (
        <div
            style={{
                background: "#111",
                color: "#fff",
                "min-height": "100vh",
            }}
        >
            <div style={heroStyle}>
                <h1>Scroll down ↓</h1>
            </div>
            <ClipReveal>
                <section
                    style={{
                        background: "#000",
                        "min-height": "50vh",
                        "padding-top": "40px",
                    }}
                >
                    <TextReveal text="Building digital experiences that blur the line between imagination and reality." />
                </section>
            </ClipReveal>
            <div style={heroStyle}>
                <h1>End</h1>
            </div>
        </div>
    )
}

const readWaapi = () =>
    parseFloat(getComputedStyle(query("#opacity-probe")).opacity)

const readJs = () => parseFloat(query("#js-progress").innerText)

describe("useScroll + transformed ancestor (regression for #3658)", () => {
    it("attaches ViewTimeline (not ScrollTimeline) to inner motion components", async (context) => {
        await visit(App)
        await wait(500)
        if (!(window as any).ViewTimeline) return context.skip()
        const anims = query("#opacity-probe").getAnimations() as any[]
        expect(anims.length).toBeGreaterThan(0)
        const a = anims[0]
        expect(a.timeline?.constructor?.name).toBe("ViewTimeline")
        // The 200vh target is taller than the viewport, so All runs forwards
        expect(a.rangeStart?.rangeName).toBe("exit-crossing")
        expect(a.rangeEnd?.rangeName).toBe("entry-crossing")
    })

    it("WAAPI and JS paths agree on the same target across the scroll range", async () => {
        await visit(App)
        await wait(500)

        const vh = window.innerHeight
        const stops = [0.5, 1, 1.25, 1.5, 1.75, 2].map((m) => m * vh)
        const drift: number[] = []

        for (const y of stops) {
            window.scrollTo(0, y)
            await wait(200)
            drift.push(Math.abs(readWaapi() - readJs()))
        }

        expect(Math.max(...drift)).toBeLessThan(0.01)
    })
})
