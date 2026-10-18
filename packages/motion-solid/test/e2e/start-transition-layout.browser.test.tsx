/**
 * Port of upstream's `cypress/integration/start-transition-layout.ts` and its page,
 * `dev/react/src/tests/start-transition-layout.tsx` (harness: `start-transition-helpers.tsx`).
 *
 * Port note: the concurrent modes are translated as described in `start-transition-helpers.tsx`
 * (an `action` holding the write for `transition`/`useTransition`, an async memo for
 * `deferred`).
 */
import { createSignal, isPending, Loading } from "solid-js"
import { motion } from "../../src"
import {
    analyze,
    click,
    configure,
    deferred,
    duration,
    expectCloseTo,
    harness,
    linear,
    type Mode,
    runScript,
    SlowList,
    update,
    useCommitLog,
    waitForDone,
} from "./start-transition-helpers"
import { nextFrame, query, visit } from "./utils"

const step = 200
const layoutTransition = { layout: { ...linear, duration } }

const scenarios: Record<string, Array<[number, () => void]>> = {
    basic: [[100, click("a-next")]],
    rapid: [
        [100, click("a-next")],
        [130, click("a-next")],
        [160, click("a-next")],
    ],
    interrupt: [
        [100, click("a-next")],
        [150, click("b-urgent")],
    ],
    midAnimation: [
        [100, click("a-urgent-next")],
        [500, click("a-back")],
    ],
    reverseBeforeCommit: [
        [100, click("a-next")],
        [140, click("a-back")],
    ],
}

function Page(props: { scenario: string }) {
    const [pos, setPos] = createSignal(0)
    const [posB, setPosB] = createSignal(0)
    const renderedPos = deferred(pos)

    useCommitLog("a", renderedPos)
    useCommitLog("b", posB)

    return (
        <div style={{ padding: "20px" }}>
            <button
                id="run"
                onClick={() => runScript(scenarios[props.scenario])}
            >
                run
            </button>
            <button
                id="a-next"
                onClick={() => update(() => setPos((p) => p + 1))}
            >
                a next
            </button>
            <button
                id="a-back"
                onClick={() => update(() => setPos((p) => p - 1))}
            >
                a back
            </button>
            <button id="a-urgent-next" onClick={() => setPos((p) => p + 1)}>
                a urgent next
            </button>
            <button id="b-urgent" onClick={() => setPosB((p) => p + 1)}>
                b urgent
            </button>
            <span id="pending">
                {isPending(() => renderedPos()) ? "pending" : "idle"}
            </span>
            <div style={{ position: "relative", width: "1000px" }}>
                <motion.div
                    id="a"
                    data-track="a"
                    layout
                    transition={layoutTransition}
                    style={{
                        width: 100,
                        height: 100,
                        marginLeft: renderedPos() * step,
                        background: "red",
                    }}
                />
                <motion.div
                    id="b"
                    data-track="b"
                    layout
                    transition={layoutTransition}
                    style={{
                        width: 100,
                        height: 100,
                        marginLeft: posB() * step,
                        background: "blue",
                    }}
                />
            </div>
            <SlowList tick={renderedPos()} />
        </div>
    )
}

function App(props: { mode: Mode; scenario: string }) {
    configure({ mode: props.mode })
    return (
        <Loading>
            <Page scenario={props.scenario} />
        </Loading>
    )
}

const modes: Mode[] = ["transition", "useTransition", "deferred"]

async function run(scenario: string, mode: Mode) {
    await visit(App, { mode, scenario })
    await nextFrame()
    await nextFrame()
    query("#run").click()
    await waitForDone()
}

const retry = (assertion: () => void) =>
    vi.waitFor(assertion, { timeout: 10000, interval: 16 })

const clickTime = (id: string) =>
    harness.events.find((e) => e.type === "click" && e.data === id)!.t

const commitsOfA = (after: number) =>
    harness.events.filter(
        (e) => e.type === "commit" && e.data.label === "a" && e.t >= after
    )

const analyzeBox = (name: string, to: number, clickId: string) =>
    analyze({ name, from: 0, to, after: clickTime(clickId) })

describe("Concurrent React: layout", () => {
    for (const mode of modes) {
        it(`basic (${mode}) animates from the committed position`, async () => {
            await run("basic", mode)
            await retry(() =>
                expectCloseTo(
                    analyzeBox("a", 200, "a-next").finalProgress,
                    1,
                    0.01
                )
            )
            const a = analyzeBox("a", 200, "a-next")
            expect(a.jumps).toBe(0)
            expect(a.animatedMs).toBeGreaterThan(250)
        }, 30000)

        it(`rapid (${mode}) batched updates retarget to the final state`, async () => {
            await run("rapid", mode)
            await retry(() =>
                expectCloseTo(
                    analyzeBox("a", 600, "a-next").finalProgress,
                    1,
                    0.01
                )
            )
            const after = clickTime("a-next")
            const a = analyze({
                name: "a",
                from: 0,
                to: 600,
                after,
                jumpFraction: 0.15,
            })
            expect(a.jumps).toBe(0)
            const commits = commitsOfA(after)
            expect(commits[commits.length - 1].data.value).toBe(3)
        }, 30000)

        it(`interrupt (${mode}) urgent update mid-render animates both`, async () => {
            await run("interrupt", mode)
            await retry(() => {
                for (const name of ["a", "b"]) {
                    expectCloseTo(
                        analyzeBox(name, 200, "a-next").finalProgress,
                        1,
                        0.01
                    )
                }
            })
            for (const name of ["a", "b"]) {
                const box = analyzeBox(name, 200, "a-next")
                expect(box.jumps).toBe(0)
                expect(box.animatedMs).toBeGreaterThan(250)
            }
        }, 30000)

        it(`midAnimation (${mode}) reverses from the current visual position`, async () => {
            const analyzeA = () =>
                analyze({
                    name: "a",
                    from: 0,
                    to: 200,
                    after: clickTime("a-urgent-next"),
                    jumpFraction: 0.15,
                })
            await run("midAnimation", mode)
            await retry(() => {
                const a = analyzeA()
                expectCloseTo(a.finalProgress, 0, 0.01)
                expect(a.stillMs).toBeGreaterThan(200)
            })
            expect(analyzeA().jumps).toBe(0)
        }, 30000)

        it(`reverseBeforeCommit (${mode}) settles back without jumping`, async () => {
            const analyzeA = () =>
                analyze({
                    name: "a",
                    from: 0,
                    to: 200,
                    after: clickTime("a-next"),
                    jumpFraction: 0.15,
                })
            await run("reverseBeforeCommit", mode)
            await retry(() => {
                const a = analyzeA()
                expectCloseTo(a.finalProgress, 0, 0.01)
                expect(a.stillMs).toBeGreaterThan(200)
            })
            const after = clickTime("a-next")
            const a = analyzeA()
            expect(a.jumps).toBe(0)
            if (mode !== "transition") {
                const back = clickTime("a-back")
                const abandoned = commitsOfA(after).find(
                    (e) => e.data.value === 1
                )
                if (abandoned) {
                    expect(abandoned.t).toBeLessThan(back)
                } else {
                    expect(a.maxDeltaFraction).toBe(0)
                }
            }
        }, 30000)
    }
})
