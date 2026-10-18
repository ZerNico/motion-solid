/**
 * Port of upstream's `cypress/integration/start-transition-layout-id.ts` and its page,
 * `dev/react/src/tests/start-transition-layout-id.tsx` (harness: `start-transition-helpers.tsx`).
 *
 * Port note: the concurrent modes are translated as described in `start-transition-helpers.tsx`.
 */
import { createSignal, For, Loading, Show } from "solid-js"
import { LayoutGroup, motion } from "../../src"
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

const layoutTransition = { layout: { ...linear, duration } }
const tabWidth = 200

const scenarios: Record<string, Array<[number, () => void]>> = {
    basic: [[100, click("tab-2")]],
    rapid: [
        [100, click("tab-1")],
        [130, click("tab-2")],
        [160, click("tab-3")],
    ],
    midAnimation: [
        [100, click("tab-2-urgent")],
        [500, click("tab-0")],
    ],
    group: [[100, click("toggle-top")]],
}

function Tabs() {
    const [tab, setTab] = createSignal(0)
    const renderedTab = deferred(tab)
    useCommitLog("tab", renderedTab)

    return (
        <div>
            <For each={[0, 1, 2, 3]}>
                {(i) => (
                    <span>
                        <button
                            id={`tab-${i}`}
                            onClick={() => update(() => setTab(i))}
                        >
                            {i}
                        </button>
                        <button
                            id={`tab-${i}-urgent`}
                            onClick={() => setTab(i)}
                        >
                            {i}!
                        </button>
                    </span>
                )}
            </For>
            <div style={{ display: "flex", width: `${tabWidth * 4}px` }}>
                <For each={[0, 1, 2, 3]}>
                    {(i) => (
                        <div
                            style={{
                                width: `${tabWidth}px`,
                                height: "40px",
                                position: "relative",
                            }}
                        >
                            Tab {i}
                            <Show when={renderedTab() === i}>
                                <motion.div
                                    layoutId="underline"
                                    data-track="underline"
                                    transition={layoutTransition}
                                    style={{
                                        position: "absolute",
                                        bottom: 0,
                                        left: 0,
                                        width: tabWidth,
                                        height: 4,
                                        background: "red",
                                    }}
                                />
                            </Show>
                        </div>
                    )}
                </For>
            </div>
            <SlowList tick={renderedTab()} />
        </div>
    )
}

function Top() {
    const [open, setOpen] = createSignal(false)
    const renderedOpen = deferred(open)
    useCommitLog("top", renderedOpen)

    return (
        <motion.div
            layout
            transition={layoutTransition}
            data-track="top"
            style={{
                width: 200,
                height: renderedOpen() ? 300 : 100,
                background: "green",
            }}
        >
            <button
                id="toggle-top"
                onClick={() => update(() => setOpen((o) => !o))}
            >
                toggle
            </button>
            <SlowList tick={renderedOpen()} />
        </motion.div>
    )
}

/**
 * Never re-renders after mount: it can only animate because it's in the same LayoutGroup as Top.
 */
const Below = () => (
    <motion.div
        layout
        transition={layoutTransition}
        data-track="below"
        style={{ width: 200, height: 100, background: "blue" }}
    />
)

function App(props: { mode: Mode; scenario: string }) {
    configure({ mode: props.mode })
    return (
        <Loading>
            <div style={{ padding: "20px" }}>
                <button
                    id="run"
                    onClick={() => runScript(scenarios[props.scenario])}
                >
                    run
                </button>
                <Tabs />
                <LayoutGroup>
                    <Top />
                    <Below />
                </LayoutGroup>
            </div>
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

const firstClick = () => harness.events.find((e) => e.type === "click")!.t

const analyzeUnderline = (to: number, jumpFraction?: number) =>
    analyze({
        name: "underline",
        from: 0,
        to,
        after: firstClick(),
        jumpFraction,
    })

describe("Concurrent React: layoutId and LayoutGroup", () => {
    for (const mode of modes) {
        it(`basic (${mode}) underline animates between tabs`, async () => {
            await run("basic", mode)
            await retry(() =>
                expectCloseTo(analyzeUnderline(400).finalProgress, 1, 0.01)
            )
            const u = analyzeUnderline(400)
            expect(u.jumps).toBe(0)
            expect(u.animatedMs).toBeGreaterThan(250)
        }, 30000)

        it(`rapid (${mode}) underline retargets to the last tab`, async () => {
            await run("rapid", mode)
            await retry(() =>
                expectCloseTo(
                    analyzeUnderline(600, 0.15).finalProgress,
                    1,
                    0.01
                )
            )
            expect(analyzeUnderline(600, 0.15).jumps).toBe(0)
        }, 30000)

        it(`midAnimation (${mode}) underline reverses from its visual position`, async () => {
            await run("midAnimation", mode)
            // Re-queried until back on the first tab and stationary
            await retry(() => {
                const u = analyzeUnderline(400, 0.15)
                expectCloseTo(u.finalProgress, 0, 0.01)
                expect(u.stillMs).toBeGreaterThan(200)
            })
            expect(analyzeUnderline(400, 0.15).jumps).toBe(0)
        }, 30000)

        it(`group (${mode}) LayoutGroup sibling animates without re-rendering`, async () => {
            const boxes = () => {
                const after = firstClick()
                return [
                    analyze({
                        name: "top",
                        axis: "h",
                        from: 0,
                        to: 200,
                        after,
                    }),
                    analyze({
                        name: "below",
                        axis: "y",
                        from: 0,
                        to: 200,
                        after,
                    }),
                ]
            }
            await run("group", mode)
            await retry(() => {
                for (const box of boxes()) {
                    expectCloseTo(box.finalProgress, 1, 0.01)
                }
            })
            for (const box of boxes()) {
                expect(box.jumps).toBe(0)
                expect(box.animatedMs).toBeGreaterThan(250)
            }
        }, 30000)
    }
})
