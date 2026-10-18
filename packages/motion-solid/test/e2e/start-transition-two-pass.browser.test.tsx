/**
 * Port of upstream's `cypress/integration/start-transition-two-pass.ts` and its page,
 * `dev/react/src/tests/start-transition-two-pass.tsx` (harness: `start-transition-helpers.tsx`).
 *
 * Port note: the outer modes are translated as described in `start-transition-helpers.tsx`.
 * React's `useLayoutEffect` and `useEffect` both map to Solid's `createEffect` (Solid has a single
 * user effect phase, run in the flush that writes the DOM, before paint), so `inner=effect` and
 * `inner=layoutEffect` are the same page here. The `effect` cases stay skipped like upstream's
 * known limitation (React schedules passive effects after paint).
 */
import { createEffect, createSignal, Loading } from "solid-js"
import { animate, motion } from "../../src"
import {
    analyze,
    click,
    configure,
    duration,
    expectCloseTo,
    harness,
    linear,
    log,
    type Mode,
    runScript,
    SlowList,
    update,
    waitForDone,
} from "./start-transition-helpers"
import { nextFrame, query, visit } from "./utils"

type Inner = "effect" | "layoutEffect"

const widths: Record<number, number> = { 1: 100, 2: 300 }

function setTargetWidth(setWidth: (width: number) => void, width: number) {
    log("set-width")
    setWidth(width)
}

function Digit(props: { value: number; inner: Inner }) {
    const target = () => widths[props.value]
    const [width, setWidth] = createSignal(widths[1])
    let roll!: HTMLDivElement

    createEffect(
        () => props.value,
        (value, prev) => {
            if (prev === undefined || value === prev) return
            log("roll-start", {
                y: roll.getBoundingClientRect().top,
                w: roll.parentElement!.getBoundingClientRect().width,
            })
            animate(roll, { y: [100, 0] }, { ...linear, duration })
        }
    )

    createEffect(target, (latest) => {
        setTargetWidth(setWidth, latest)
    })

    return (
        <motion.div
            data-track="digit"
            layout
            onLayoutAnimationStart={() => log("width-start")}
            transition={{ layout: { ...linear, duration } }}
            style={{
                width: width(),
                height: 100,
                background: "#ddd",
                overflow: "hidden",
            }}
        >
            <div
                ref={roll}
                data-track="roll"
                style={{ width: "20px", height: "100px" }}
            >
                {props.value}
            </div>
        </motion.div>
    )
}

const scenarios: Record<string, Array<[number, () => void]>> = {
    basic: [[100, click("next")]],
}

function App(props: { mode: Mode; inner: Inner }) {
    configure({ mode: props.mode })
    const [value, setValue] = createSignal(1)

    return (
        <Loading>
            <div style={{ padding: "20px" }}>
                <button id="run" onClick={() => runScript(scenarios.basic)}>
                    run
                </button>
                <button id="next" onClick={() => update(() => setValue(2))}>
                    next
                </button>
                <Digit value={value()} inner={props.inner} />
                <SlowList tick={value()} />
            </div>
        </Loading>
    )
}

const cases: Array<[Mode, Inner]> = [
    ["sync", "layoutEffect"],
    ["transition", "layoutEffect"],
    ["useTransition", "layoutEffect"],
    ["sync", "effect"],
    ["transition", "effect"],
    ["useTransition", "effect"],
]

const knownLimitations = [
    "sync effect",
    "transition effect",
    "useTransition effect",
]
const test = (key: string) => (knownLimitations.includes(key) ? it.skip : it)

const event = (type: string) => harness.events.find((e) => e.type === type)

/**
 * The width animation, measured from the width the page recorded as the roll started.
 */
const analyzeWidth = () => {
    const start = event("roll-start")!
    return analyze({
        name: "digit",
        axis: "w",
        from: 0,
        to: 200,
        after: start.t,
        startValue: start.data.w,
    })
}

describe("Concurrent React: two-pass FLIP", () => {
    for (const [mode, inner] of cases) {
        test(`${mode} ${inner}`)(
            `outer ${mode}, inner ${inner}: roll and width start on the same frame`,
            async () => {
                await visit(App, { mode, inner })
                await nextFrame()
                await nextFrame()
                query("#run").click()
                await waitForDone()
                // Re-queried until the width animation has finished
                await vi.waitFor(
                    () => {
                        expect(event("roll-start")).toBeDefined()
                        expect(event("width-start")).toBeDefined()
                        expectCloseTo(analyzeWidth().finalProgress, 1, 0.01)
                    },
                    { timeout: 10000, interval: 16 }
                )
                const rollStart = event("roll-start")!.t
                const widthStart = event("width-start")!.t
                const framesBetween = harness.samples.filter(
                    (s) => s.t > rollStart && s.t < widthStart
                ).length
                expect(framesBetween).toBe(0)

                const width = analyzeWidth()
                expect(width.jumps).toBe(0)
                expect(width.animatedMs).toBeGreaterThan(250)
            },
            30000
        )
    }
})
