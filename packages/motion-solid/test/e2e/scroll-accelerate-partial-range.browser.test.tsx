/**
 * Port of upstream's Playwright spec `tests/react/scroll-accelerate-partial-range.spec.ts` and
 * its page, `dev/react/src/tests/scroll-accelerate-partial-range.tsx`.
 *
 * Opacities whose useTransform input ranges cover only part of the page's scroll progress,
 * which is accelerated with a ScrollTimeline where it's supported. A text reveal gives each
 * word [i / n, (i + 1) / n].
 */
import { render } from "@solidjs/testing-library"
import type { JSX } from "@solidjs/web"
import { flush, For, onSettled, type Component } from "solid-js"
import { page } from "vitest/browser"
import {
    easeIn,
    easeOut,
    motion,
    useScroll,
    useTransform,
    type MotionValue,
} from "../../src"
import { nextFrame, should, visit, wait } from "./utils"

interface Cell {
    name: string
    element: HTMLElement
    opacity: MotionValue<number>
}

const cells: Cell[] = []

const readCells = () =>
    cells.map(({ name, element, opacity }) => ({
        name,
        js: opacity.get(),
        native: parseFloat(getComputedStyle(element).opacity),
        timeline: (element.getAnimations()[0]?.timeline as any)?.constructor
            .name as string | undefined,
    }))

function Probe(props: {
    name: string
    progress: MotionValue<number>
    inputRange: number[]
    outputRange: number[]
    ease?: Array<(v: number) => number>
}) {
    let ref!: HTMLSpanElement
    // eslint-disable-next-line solid/reactivity
    const opacity = useTransform(
        props.progress,
        props.inputRange,
        props.outputRange,
        {
            // eslint-disable-next-line solid/reactivity
            ease: props.ease,
        }
    )

    onSettled(() => {
        const cell = { name: props.name, element: ref, opacity }
        cells.push(cell)
        return () => {
            cells.splice(cells.indexOf(cell), 1)
        }
    })

    return (
        <motion.span ref={ref} style={{ opacity, margin: 4 }}>
            {props.name}
        </motion.span>
    )
}

const words = "Magic UI will change the way you design.".split(" ")

function App() {
    const { scrollYProgress } = useScroll()

    return (
        <div style={{ height: "3000px" }}>
            <div style={{ position: "fixed", top: "0px", left: "0px" }}>
                <For each={words}>
                    {(word, i) => (
                        <Probe
                            name={`word ${i()} "${word}"`}
                            progress={scrollYProgress}
                            inputRange={[
                                i() / words.length,
                                (i() + 1) / words.length,
                            ]}
                            outputRange={[0, 1]}
                        />
                    )}
                </For>
                <Probe
                    name="eased segments"
                    progress={scrollYProgress}
                    inputRange={[0.2, 0.4, 0.6]}
                    outputRange={[0.2, 1, 0.5]}
                    ease={[easeIn, easeOut]}
                />
            </div>
        </div>
    )
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

describe("useTransform acceleration with a partial input range", () => {
    beforeEach(async () => {
        await visitAt(App, 500, 500)
        await should(() => expect(readCells().length).toBe(9))
        await wait(100)
    })

    it("accelerated opacity matches the JS transform across the whole scroll", async (context) => {
        const supported = "ScrollTimeline" in window
        if (!supported) return context.skip("ScrollTimeline is not supported")

        expect(
            readCells()
                .filter((cell) => cell.timeline !== "ScrollTimeline")
                .map((cell) => `${cell.name}: ${cell.timeline}`)
        ).toEqual([])

        const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight
        const mismatches: string[] = []

        for (let y = 0; y <= maxScroll; y += 50) {
            window.scrollTo(0, y)
            await nextFrames()

            for (const cell of readCells()) {
                if (Math.abs(cell.native - cell.js) > 0.01) {
                    mismatches.push(
                        `${cell.name} at ${y}px: ${cell.native.toFixed(
                            3
                        )} (JS ${cell.js.toFixed(3)})`
                    )
                }
            }
        }

        expect(mismatches).toEqual([])
    })
})
