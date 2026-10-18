/**
 * Port of upstream's `cypress/integration/start-transition-presence-wait.ts` and its page,
 * `dev/react/src/tests/start-transition-presence.tsx` (harness: `start-transition-helpers.tsx`).
 * The page is duplicated from `start-transition-presence.browser.test.tsx`.
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

const modes: Mode[] = ["transition", "useTransition", "deferred"]

async function run(
    scenario: string,
    mode: Mode,
    extra: { slowCount?: number } = {}
) {
    await visit(App, { mode, presence: "wait", scenario, ...extra })
    await nextFrame()
    await nextFrame()
    query("#run").click()
    await waitForDone()
}

// Re-queried until only `id` is rendered and it has fully entered
async function expectOnly(id: string) {
    await vi.waitFor(
        () => expect(document.querySelectorAll(".wait-child")).toHaveLength(1),
        { timeout: 60000, interval: 16 }
    )
    await vi.waitFor(
        () =>
            expect(getComputedStyle(query(`#child-${id}-el`)).opacity).toBe(
                "1"
            ),
        { timeout: 60000, interval: 16 }
    )
}

describe("Concurrent React: AnimatePresence mode=wait", () => {
    for (const mode of modes) {
        it(`swap (${mode}) exits A fully before B enters`, async () => {
            await run("waitSwap", mode)
            await expectOnly("B")
            const after = harness.events.find((e) => e.type === "click")!.t
            const a = analyze({
                name: "child-A",
                axis: "opacity",
                from: 1,
                to: 0,
                after,
                durationMs: 500,
            })
            const b = analyze({
                name: "child-B",
                axis: "opacity",
                from: 0,
                to: 1,
                after,
                durationMs: 500,
            })
            /**
             * Port note: motion-solid removes an exiting child in the task its exit
             * completes (React in a later render), so a frame may not sample A at opacity
             * 0: its exit then ends at its last sample, taken at its very end.
             */
            const aEnd =
                a.reachedEndAt ??
                (a.finalProgress! > 0.9 ? a.lastSampleAt : null)
            expect(aEnd).not.toBeNull()
            expect(aEnd! - a.firstMoveAt!).toBeGreaterThan(250)
            expect(b.intermediateFrames).toBeGreaterThan(0)
            expect(b.firstMoveAt).toBeGreaterThan(aEnd! - 1)
        }, 90000)

        it(`rapid (${mode}) ends on the last child only`, async () => {
            await run("waitRapid", mode)
            await expectOnly("C")
        }, 90000)

        it(`midExit (${mode}) switching again mid-exit ends on C`, async () => {
            await run("waitMidExit", mode)
            await expectOnly("C")
        }, 90000)

        it(`exitDuringTransition (${mode}) exit completes while the switch to C renders`, async () => {
            await run("waitExitDuringTransition", mode, { slowCount: 30 })
            await expectOnly("C")
        }, 90000)
    }
})
