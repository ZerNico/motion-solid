/**
 * Port of upstream's `cypress/integration/reorder-transition.ts` and its page,
 * `dev/react/src/tests/reorder-transition.tsx`.
 *
 * Reorder.Group must not call onReorder again with the same order while the previous order is
 * still pending (onReorder in a transition, or values from useDeferredValue).
 *
 * Port note: the order update is held by pending async work, Solid 2's equivalent:
 * - `useTransition`: `onReorder` sets the order in an `action` that then does the slow render
 *   (the items' labels re-rendering, ~10ms each) as async work, so the write commits after it.
 * - `deferred`: the write is urgent, and `values` is an async memo of it that resolves after the
 *   slow render.
 * Solid doesn't re-render the labels, so the slow render is that async work, done in chunks that
 * yield to the event loop like React's time-sliced render. `window.reorderCalls`/`dragDone` are
 * module state.
 */
import {
    action,
    createMemo,
    createSignal,
    For,
    Loading,
    untrack,
} from "solid-js"
import { Reorder } from "../../src"
import { query, should, visit } from "./utils"

type Mode = "useTransition" | "deferred"

const itemHeight = 60
const initialItems = ["0", "1", "2", "3", "4", "5"]

let reorderCalls: string[] = []
let dragDone = false
let timers: ReturnType<typeof setTimeout>[] = []

function busy(ms: number) {
    const end = performance.now() + ms
    let now = 0
    while (now < end) now = performance.now()
}

const yieldToEventLoop = () =>
    new Promise<void>((resolve) => {
        const channel = new MessageChannel()
        channel.port1.onmessage = () => resolve()
        channel.port2.postMessage(null)
    })

/**
 * Upstream's `Label`s re-rendering with the new order: 10ms each.
 */
async function slowRender() {
    for (let i = 0; i < initialItems.length; i++) {
        busy(10)
        await yieldToEventLoop()
    }
}

function Label(props: { value: string }) {
    busy(10)
    return <>{props.value}</>
}

function dispatch(type: string, target: EventTarget, x: number, y: number) {
    target.dispatchEvent(
        new PointerEvent(type, {
            clientX: x,
            clientY: y,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            bubbles: true,
            cancelable: true,
        })
    )
}

/**
 * Drag the first item 3.5 rows down with a pointermove every 16ms.
 */
function drag() {
    const el = document.getElementById("item-0")!
    const { left, top } = el.getBoundingClientRect()
    const x = left + 20
    const startY = top + 20
    const moves = 40
    const distance = itemHeight * 3.5

    dispatch("pointerdown", el, x, startY)
    for (let i = 1; i <= moves; i++) {
        timers.push(
            setTimeout(
                () =>
                    dispatch(
                        "pointermove",
                        window,
                        x,
                        startY + (distance * i) / moves
                    ),
                i * 16
            )
        )
    }
    timers.push(
        setTimeout(() => {
            dispatch("pointerup", window, x, startY + distance)
            timers.push(setTimeout(() => (dragDone = true), 500))
        }, moves * 16 + 300)
    )
}

function App(props: { mode: Mode }) {
    reorderCalls = []
    dragDone = false
    const mode = untrack(() => props.mode)

    const [items, setItems] = createSignal(initialItems)
    const setItemsInTransition = action(function* (next: string[]) {
        setItems(next)
        yield slowRender()
    })
    let first = true
    const deferredItems = createMemo(() => {
        const value = items()
        if (first || mode !== "deferred") {
            first = false
            return value
        }
        return slowRender().then(() => value)
    })
    const values = () => (mode === "deferred" ? deferredItems() : items())

    return (
        <Loading>
            <div style={{ padding: "20px" }}>
                <button id="drag" onClick={drag}>
                    drag
                </button>
                <Reorder.Group
                    axis="y"
                    values={values()}
                    onReorder={(next) => {
                        reorderCalls.push(next.join(""))
                        mode === "useTransition"
                            ? setItemsInTransition(next)
                            : setItems(next)
                    }}
                    style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        width: 200,
                    }}
                >
                    <For each={values()}>
                        {(item) => (
                            <Reorder.Item
                                value={item}
                                id={`item-${item}`}
                                transition={{ duration: 0.2 }}
                                style={{
                                    height: itemHeight,
                                    background: "#eee",
                                    borderBottom: "1px solid #999",
                                    boxSizing: "border-box",
                                }}
                            >
                                <Label value={item} />
                            </Reorder.Item>
                        )}
                    </For>
                </Reorder.Group>
            </div>
        </Loading>
    )
}

describe("Reorder with non-urgent order updates", () => {
    afterEach(() => {
        timers.forEach(clearTimeout)
        timers = []
    })

    for (const mode of ["useTransition", "deferred"] as const) {
        it(`calls onReorder once per new order (${mode})`, async () => {
            await visit(App, { mode })
            query("#drag").click()
            await should(() => expect(dragDone).toBe(true), {
                timeout: 10000,
            })
            const calls = reorderCalls
            expect(calls.length).toBeGreaterThan(0)
            // The drag crosses at most 3 rows.
            expect(calls.length).toBeLessThanOrEqual(3)
            for (let i = 1; i < calls.length; i++) {
                expect(calls[i]).not.toBe(calls[i - 1])
            }
        }, 15000)
    }
})
