/**
 * Port of upstream's Playwright spec `tests/react/scroll-view-timeline-parity.spec.ts` and its
 * page, `dev/react/src/tests/scroll-view-timeline-parity.tsx`.
 *
 * useScroll's progress is always tracked in JS, while opacity bound to it is accelerated with a
 * ViewTimeline where possible. The two should agree.
 */
import { render } from "@solidjs/testing-library"
import type { JSX } from "@solidjs/web"
import {
    createSignal,
    flush,
    For,
    onSettled,
    type Accessor,
    type Component,
} from "solid-js"
import { page } from "vitest/browser"
import { motion, useScroll, useTransform, type MotionValue } from "../../src"
import { nextFrame, should, visit, wait } from "./utils"

const offsets: [string, any][] = [
    ["default", undefined],
    [
        "Enter",
        [
            [0, 1],
            [1, 1],
        ],
    ],
    [
        "Exit",
        [
            [0, 0],
            [1, 0],
        ],
    ],
    [
        "Any",
        [
            [1, 0],
            [0, 1],
        ],
    ],
    [
        "All",
        [
            [0, 0],
            [1, 1],
        ],
    ],
    ["start end, end start", ["start end", "end start"]],
    ["start start, end end", ["start start", "end end"]],
    ["end end, start start", ["end end", "start start"]],
    ["center start, end end", ["center start", "end end"]],
    ["start center, end start", ["start center", "end start"]],
]

const sizes = { small: 100, large: 800, equal: 500 }

interface Cell {
    name: string
    size: string
    element: HTMLElement
    progress: MotionValue<number>
    // A useTransform input range applied to progress
    range?: [number, number]
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))

const cells: Cell[] = []

const readCells = () =>
    cells.map(
        ({ name, size, element, progress, range: [from, to] = [0, 1] }) => ({
            name,
            size,
            accelerated: !!progress.accelerate,
            js: clamp((progress.get() - from) / (to - from)),
            native: parseFloat(getComputedStyle(element).opacity),
            timeline: (element.getAnimations()[0]?.timeline as any)?.constructor
                .name as string | undefined,
        })
    )

type ReadCell = ReturnType<typeof readCells>[number]

const useCell = (
    ref: () => HTMLElement | undefined,
    cell: Omit<Cell, "element">
) =>
    onSettled(() => {
        const registered = { ...cell, element: ref()! }
        cells.push(registered)
        return () => {
            cells.splice(cells.indexOf(registered), 1)
        }
    })

const probe = { width: 1, height: 1 }

function Probe(props: {
    name: string
    size: string
    offset: any
    target: Accessor<HTMLDivElement | undefined>
}) {
    let ref: HTMLDivElement | undefined
    // eslint-disable-next-line solid/reactivity
    const { scrollYProgress } = useScroll({
        target: props.target,
        offset: props.offset,
    })

    // eslint-disable-next-line solid/reactivity
    useCell(() => ref, {
        name: props.name,
        size: props.size,
        progress: scrollYProgress,
    })

    return (
        <motion.div ref={ref} style={{ ...probe, opacity: scrollYProgress }} />
    )
}

function Target(props: { size: keyof typeof sizes }) {
    const [ref, setRef] = createSignal<HTMLDivElement>()
    return (
        <>
            <div style={spacer} />
            <div
                ref={setRef}
                id={props.size}
                style={{
                    height: `${sizes[props.size]}px`,
                    background: "#0077ff",
                }}
            />
            <div style={probes}>
                <For each={offsets}>
                    {([name, offset]) => (
                        <Probe
                            name={name}
                            size={props.size}
                            offset={offset}
                            target={ref}
                        />
                    )}
                </For>
            </div>
        </>
    )
}

/**
 * #3658 reproductions: magicui's text reveal, a tall target with a sticky
 * child whose words are motion components bound to useScroll progress.
 */
function Word(props: {
    text: string
    progress: MotionValue<number>
    range: [number, number]
    size: string
}) {
    let ref: HTMLSpanElement | undefined
    // eslint-disable-next-line solid/reactivity
    const opacity = useTransform(props.progress, props.range, [0, 1])
    // eslint-disable-next-line solid/reactivity
    useCell(() => ref, {
        name: `word "${props.text}"`,
        size: props.size,
        progress: props.progress,
        range: props.range,
    })
    return (
        <motion.span ref={ref} style={{ opacity, margin: 4 }}>
            {props.text}
        </motion.span>
    )
}

function TextReveal(props: { size: string; offset?: any }) {
    const [ref, setRef] = createSignal<HTMLDivElement>()
    let probeRef: HTMLDivElement | undefined
    // eslint-disable-next-line solid/reactivity
    const { scrollYProgress } = useScroll({ target: ref, offset: props.offset })
    // eslint-disable-next-line solid/reactivity
    useCell(() => probeRef, {
        name: "text reveal",
        size: props.size,
        progress: scrollYProgress,
    })
    const words = "Magic UI will change the way you design.".split(" ")

    return (
        <div
            ref={setRef}
            id={props.size}
            style={{ position: "relative", height: "1000px" }}
        >
            <div style={{ position: "sticky", top: "0px", height: "50%" }}>
                <motion.div
                    ref={probeRef}
                    style={{ ...probe, opacity: scrollYProgress }}
                />
                <For each={words}>
                    {(text, i) => (
                        <Word
                            text={text}
                            size={props.size}
                            progress={scrollYProgress}
                            range={[
                                i() / words.length,
                                (i() + 1) / words.length,
                            ]}
                        />
                    )}
                </For>
            </div>
        </div>
    )
}

// The CodeSandbox: inside a parent whose scale and clip-path track its scroll
function TransformedParent() {
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
                <TextReveal
                    size="transformed-parent"
                    offset={["start start", "end end"]}
                />
            </motion.div>
        </div>
    )
}

// lezan/use-scroll-bug: inside a fixed overlay, with the default offset
const FixedOverlay = () => (
    <div
        style={{
            position: "fixed",
            inset: "0px",
            "pointer-events": "none",
        }}
    >
        <div style={{ height: "500px" }}>
            <TextReveal size="fixed-overlay" />
        </div>
    </div>
)

function App() {
    return (
        <div>
            <Target size="small" />
            <Target size="large" />
            <Target size="equal" />
            <div style={spacer} />
            <TransformedParent />
            <div style={spacer} />
            <FixedOverlay />
        </div>
    )
}

const spacer: JSX.CSSProperties = { height: "600px" }
const probes: JSX.CSSProperties = {
    position: "fixed",
    top: "0px",
    left: "0px",
}

/**
 * `test.use({ viewport })` + `page.goto()`: renders the page at that viewport size.
 */
async function visitAt(App: Component, width: number, height: number) {
    await visit(() => null)
    await page.viewport(width, height)
    await nextFrame()
    await nextFrame()
    render(() => (<App />) as JSX.Element)
    flush()
    await nextFrame()
}

const nextFrames = async () => {
    await nextFrame()
    await nextFrame()
    await nextFrame()
}

const isWord = (cell: ReadCell) => cell.name.startsWith("word ")

async function findMismatches(
    include: (cell: ReadCell) => boolean,
    label = ""
) {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const mismatches: string[] = []

    for (let y = 0; y <= maxScroll; y += 50) {
        // scrollInfo doesn't track target resizes, so always fire a scroll
        window.scrollTo(0, y)
        window.dispatchEvent(new Event("scroll"))
        await nextFrames()

        for (const cell of readCells().filter(include)) {
            if (Math.abs(cell.native - cell.js) > 0.01) {
                mismatches.push(
                    `${label}${cell.size} target, ${
                        cell.name
                    } at ${y}px: ${cell.native.toFixed(
                        3
                    )} (JS ${cell.js.toFixed(3)})`
                )
            }
        }
    }

    return mismatches
}

/**
 * Every offset except one with a container edge at "center" has a
 * ViewTimeline range, so should be accelerated.
 */
const hasRange = (cell: ReadCell) => cell.name !== "start center, end start"

describe("useScroll target acceleration", () => {
    beforeEach(async () => {
        await visitAt(App, 500, 500)
        await should(() => expect(readCells().length).toBe(48))
        await wait(100)
    })

    /**
     * Sweeps the page, then again after swapping the short and tall
     * targets, then after making the viewport taller than every target.
     */
    async function findMismatchesWithResizes(
        include: (cell: ReadCell) => boolean
    ) {
        const mismatches = await findMismatches(include)

        document.getElementById("small")!.style.height = "800px"
        document.getElementById("large")!.style.height = "100px"
        mismatches.push(...(await findMismatches(include, "target resize: ")))

        await page.viewport(500, 1000)
        mismatches.push(...(await findMismatches(include, "viewport resize: ")))

        return mismatches
    }

    it("accelerated opacity matches JS progress, before and after resizes", async (context) => {
        const supported = "ViewTimeline" in window
        if (!supported) return context.skip("ViewTimeline is not supported")

        const unexpected = readCells()
            .filter(
                (cell) =>
                    cell.accelerated !== hasRange(cell) ||
                    (cell.timeline === "ViewTimeline") !== hasRange(cell)
            )
            .map(
                (cell) =>
                    `${cell.size} target, ${cell.name}: accelerated ${cell.accelerated}, ${cell.timeline}`
            )
        expect(unexpected).toEqual([])

        expect(
            await findMismatchesWithResizes((cell) => !isWord(cell))
        ).toEqual([])
    }, 120_000)

    /**
     * #3658: each word's useTransform input range covers part of the
     * progress, so its accelerated keyframes need padding to offsets 0
     * and 1 to hold their end values.
     */
    it("accelerated per-word text reveals match JS progress (#3658)", async (context) => {
        const supported = "ViewTimeline" in window
        if (!supported) return context.skip("ViewTimeline is not supported")

        expect(await findMismatchesWithResizes(isWord)).toEqual([])
    }, 120_000)
})
