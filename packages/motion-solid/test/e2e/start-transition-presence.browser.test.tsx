/**
 * Port of upstream's `cypress/integration/start-transition-presence.ts` and its page,
 * `dev/react/src/tests/start-transition-presence.tsx` (harness: `start-transition-helpers.tsx`).
 * mode="wait" is in `start-transition-presence-wait.browser.test.tsx` (same page).
 *
 * Port note: the concurrent modes are translated as described in `start-transition-helpers.tsx`.
 * The list and the keyed child use motion-solid's presence-aware `For`/`Show`.
 */
import { createSignal, Loading } from "solid-js"
import { AnimatePresence, For, motion, Show } from "../../src"
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

type Presence = "sync" | "popLayout" | "wait"

const exit = { opacity: 0, transition: { ...linear, duration: 0.5 } }
const layoutTransition = { layout: { ...linear, duration } }

const scenarios: Record<string, Array<[number, () => void]>> = {
    remove: [[100, click("remove-B")]],
    toggleBeforeCommit: [
        [100, click("remove-B")],
        [140, click("add-B")],
    ],
    reenterMidExit: [
        [100, click("remove-B-urgent")],
        [350, click("add-B")],
    ],
    exitDuringTransition: [
        [100, click("remove-B-urgent")],
        [700, click("add-D")],
    ],
    waitSwap: [[100, click("child-B")]],
    waitRapid: [
        [100, click("child-B")],
        [130, click("child-C")],
        [160, click("child-A")],
        [190, click("child-C")],
    ],
    waitExitDuringTransition: [
        [100, click("child-B-urgent")],
        [700, click("child-C")],
    ],
    waitMidExit: [
        [100, click("child-B-urgent")],
        [350, click("child-C")],
    ],
}

function Item(props: { id: string }) {
    return (
        <motion.div
            id={`item-${props.id}`}
            data-track={`item-${props.id}`}
            layout
            transition={layoutTransition}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { ...linear, duration: 0.5 } }}
            exit={exit}
            style={{ width: 100, height: 100, background: "red" }}
        >
            {props.id}
        </motion.div>
    )
}

function Page(props: { presence: Presence; scenario: string }) {
    const [items, setItems] = createSignal(["A", "B", "C"])
    const [child, setChild] = createSignal("A")
    const renderedItems = deferred(items)
    const renderedChild = deferred(child)
    useCommitLog("items", () => renderedItems().join(""))
    useCommitLog("child", renderedChild)

    const withoutB = (list: string[]) => list.filter((i) => i !== "B")
    const withB = (list: string[]) =>
        list.includes("B") ? list : ["A", "B", ...list.slice(1)]

    return (
        <div style={{ padding: "20px" }}>
            <button
                id="run"
                onClick={() => runScript(scenarios[props.scenario], 1500)}
            >
                run
            </button>
            <button
                id="remove-B"
                onClick={() => update(() => setItems(withoutB))}
            >
                remove B
            </button>
            <button id="remove-B-urgent" onClick={() => setItems(withoutB)}>
                remove B urgent
            </button>
            <button id="add-B" onClick={() => update(() => setItems(withB))}>
                add B
            </button>
            <button
                id="add-D"
                onClick={() => update(() => setItems((l) => [...l, "D"]))}
            >
                add D
            </button>
            {["A", "B", "C"].map((c) => (
                <button
                    id={`child-${c}`}
                    onClick={() => update(() => setChild(c))}
                >
                    child {c}
                </button>
            ))}
            <button id="child-B-urgent" onClick={() => setChild("B")}>
                child B urgent
            </button>
            {props.presence === "wait" ? (
                <div style={{ position: "relative" }}>
                    <AnimatePresence mode="wait" initial={false}>
                        <Show when={renderedChild()} keyed>
                            {(c) => (
                                <motion.div
                                    id={`child-${c}-el`}
                                    class="wait-child"
                                    data-track={`child-${c}`}
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: 1,
                                        transition: {
                                            ...linear,
                                            duration: 0.5,
                                        },
                                    }}
                                    exit={exit}
                                    style={{
                                        width: 100,
                                        height: 100,
                                        background: "blue",
                                    }}
                                >
                                    {c}
                                </motion.div>
                            )}
                        </Show>
                    </AnimatePresence>
                </div>
            ) : (
                <div style={{ position: "relative" }}>
                    <AnimatePresence mode={props.presence} initial={false}>
                        <For each={renderedItems()}>
                            {(id) => <Item id={id} />}
                        </For>
                    </AnimatePresence>
                </div>
            )}
            <SlowList tick={renderedItems().join("") + renderedChild()} />
        </div>
    )
}

function App(props: {
    mode: Mode
    presence: Presence
    scenario: string
    slowCount?: number
}) {
    configure({ mode: props.mode, slowCount: props.slowCount })
    return (
        <Loading>
            <Page presence={props.presence} scenario={props.scenario} />
        </Loading>
    )
}

const modes: Mode[] = ["transition", "useTransition"]

async function run(
    scenario: string,
    mode: Mode,
    presence: Presence,
    extra: { slowCount?: number } = {}
) {
    await visit(App, { mode, presence, scenario, ...extra })
    await nextFrame()
    await nextFrame()
    query("#run").click()
    await waitForDone()
}

const firstClick = () => harness.events.find((e) => e.type === "click")!.t

const clickTime = (id: string) =>
    harness.events.find((e) => e.type === "click" && e.data === id)!.t

const commit = (value: string) =>
    harness.events.find(
        (e) =>
            e.type === "commit" &&
            e.data.label === "items" &&
            e.data.value === value
    )

const analyzeItem = (id: string, axis: "y" | "opacity", to: number) =>
    analyze({
        name: `item-${id}`,
        axis,
        from: axis === "opacity" ? 1 : 0,
        to,
        after: firstClick(),
    })

/**
 * Re-queried until the items, in order and fully faded in, match `ids`, and C has finished
 * moving to `cProgress` (1 = moved up into B's slot).
 */
async function settle(ids: string[], cProgress: number) {
    await vi.waitFor(
        () => {
            const els = Array.from(
                document.querySelectorAll<HTMLElement>("[data-track^=item-]")
            )
            expect(els.map((el) => el.dataset.track)).toEqual(
                ids.map((id) => `item-${id}`)
            )
            els.forEach((el) =>
                expect(parseFloat(getComputedStyle(el).opacity)).toBe(1)
            )
        },
        { timeout: 60000, interval: 16 }
    )
    await vi.waitFor(
        () =>
            expectCloseTo(
                analyzeItem("C", "y", -100).finalProgress,
                cProgress,
                0.01
            ),
        { timeout: 60000, interval: 16 }
    )
}

describe("Concurrent React: AnimatePresence", () => {
    for (const presence of ["sync", "popLayout"] as const) {
        for (const mode of [...modes, "deferred" as const]) {
            it(`remove (${presence}, ${mode}) exits and siblings animate`, async () => {
                await run("remove", mode, presence)
                await settle(["A", "C"], 1)
                const b = analyzeItem("B", "opacity", 0)
                const c = analyzeItem("C", "y", -100)
                expect(c.jumps, "C position jumps").toBe(0)
                expect(c.animatedMs).toBeGreaterThan(250)
                // B faded out over its 0.5s exit rather than vanishing
                expect(b.intermediateFrames).toBeGreaterThan(0)
                expect(b.lastSampleAt! - commit("AC")!.t).toBeGreaterThan(400)
                if (presence === "popLayout") {
                    // Popped out: C moves while B is still exiting
                    expect(c.firstMoveAt).toBeLessThan(b.lastSampleAt!)
                } else {
                    // C only moves once B has been removed
                    expect(c.firstMoveAt).toBeGreaterThan(b.lastSampleAt!)
                }
            }, 90000)
        }

        for (const mode of modes) {
            it(`toggleBeforeCommit (${presence}, ${mode}) ends where it started`, async () => {
                await run("toggleBeforeCommit", mode, presence)
                await settle(["A", "B", "C"], 0)
                const c = analyze({
                    name: "item-C",
                    axis: "y",
                    from: 0,
                    to: -100,
                    after: firstClick(),
                    jumpFraction: 0.15,
                })
                expect(c.jumps).toBe(0)
                if (mode === "useTransition") {
                    const removed = commit("AC")
                    if (removed) {
                        expect(removed.t).toBeLessThan(clickTime("add-B"))
                    } else {
                        expect(c.maxDeltaFraction).toBe(0)
                    }
                }
            }, 90000)

            it(`reenterMidExit (${presence}, ${mode}) B re-enters once`, async () => {
                await run("reenterMidExit", mode, presence)
                await settle(["A", "B", "C"], 0)
                expect(analyzeItem("C", "y", -100).jumps).toBe(0)
            }, 90000)

            it(`exitDuringTransition (${presence}, ${mode}) exit completes while a transition renders`, async () => {
                await run("exitDuringTransition", mode, presence, {
                    slowCount: 30,
                })
                await settle(["A", "C", "D"], 1)
                expect(analyzeItem("C", "y", -100).jumps).toBe(0)
            }, 90000)
        }
    }
})
