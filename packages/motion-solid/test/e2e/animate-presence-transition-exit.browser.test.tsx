/**
 * Port of upstream's `cypress/integration/animate-presence-transition-exit.ts` and its page,
 * `dev/react/src/tests/animate-presence-transition-exit.tsx`.
 *
 * A child is added in a transition while another child's exit animation
 * completes mid-render of that transition.
 *
 * Port note: upstream adds the child with React's `startTransition`/`useTransition`, whose
 * time-sliced render (a slow list, ~500ms) the exit completes in the middle of. Solid renders
 * synchronously, but a write made in an `action` is held (computed, not committed) until the
 * action settles. So `add D` is an action that's held for ~500ms by async work: the components
 * reading the items compute right away ("transitionRender"), the DOM is written when it lands
 * ("transitionCommit"), and B's exit completes in between. Solid has a single transition
 * mechanism, so the `start` and `use` variants run the same page.
 */
import {
    action,
    createEffect,
    createMemo,
    createSignal,
    For as SolidFor,
} from "solid-js"
import { AnimatePresence, For, motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

type Log = Record<string, number>

let log: Log = {}
const mark = (name: string) => {
    if (log[name] === undefined) log[name] = performance.now()
}

function SlowList(props: { hasD: boolean }) {
    const hasD = createMemo(() => {
        if (props.hasD) mark("transitionRender")
        return props.hasD
    })
    return (
        <div style={{ display: "none" }} data-has-d={hasD()}>
            <SolidFor each={Array.from({ length: 50 }, (_, i) => i)}>
                {() => null}
            </SolidFor>
        </div>
    )
}

function App(props: { mode?: "sync" | "popLayout"; transition?: string }) {
    const [items, setItems] = createSignal(["A", "B", "C"])
    const key = createMemo(() => items().join(""))

    const addD = action(function* () {
        setItems((l) => [...l, "D"])
        // Holds the transition, like upstream's slow concurrent render.
        yield wait(500)
    })

    createEffect(key, (key) => {
        if (key === "ACD") mark("transitionCommit")
    })

    return (
        <div style={{ position: "relative" }}>
            <button
                id="remove"
                onClick={() => setItems((l) => l.filter((i) => i !== "B"))}
            >
                remove B
            </button>
            <button id="add" onClick={() => addD()}>
                add D
            </button>
            <div id="state">{key()}</div>
            <AnimatePresence
                mode={props.mode || "sync"}
                initial={false}
                onExitComplete={() => mark("exitComplete")}
            >
                <For each={items()}>
                    {(id) => (
                        <motion.div
                            id={`item-${id}`}
                            class="item"
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: "linear" }}
                            style={{
                                width: 100,
                                height: 100,
                                background: "red",
                            }}
                        />
                    )}
                </For>
            </AnimatePresence>
            <SlowList hasD={items().includes("D")} />
        </div>
    )
}

describe("AnimatePresence: exit completes during a transition render", () => {
    for (const mode of ["sync", "popLayout"] as const) {
        for (const transition of ["start", "use"]) {
            it(`renders the child added by the transition (${mode}, ${transition})`, async () => {
                log = {}
                await visit(App, { mode, transition })
                await wait(200)
                trigger(query("#remove"), "click")
                await wait(100)
                trigger(query("#add"), "click")
                await should(() =>
                    expect(query("#state").textContent).toBe("ACD")
                )
                await wait(500)
                expect(log.exitComplete).toBeGreaterThan(log.transitionRender)
                expect(log.exitComplete).toBeLessThan(log.transitionCommit)
                expect(
                    Array.from(document.querySelectorAll(".item")).map(
                        (el) => el.id
                    )
                ).toEqual(["item-A", "item-C", "item-D"])
            })
        }
    }
})
