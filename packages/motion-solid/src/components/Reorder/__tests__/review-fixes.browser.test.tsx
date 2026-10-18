import { render } from "@solidjs/testing-library"
import { createSignal, createStore, flush, For, Show } from "solid-js"
import { Reorder, useDragControls } from "../../.."

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

function pointer(
    type: "pointerdown" | "pointermove" | "pointerup",
    target: EventTarget,
    x: number,
    y: number
) {
    target.dispatchEvent(
        new PointerEvent(type, {
            clientX: x,
            clientY: y,
            pageX: x,
            pageY: y,
            isPrimary: true,
            pointerId: 1,
            pointerType: "mouse",
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            bubbles: true,
            cancelable: true,
        } as PointerEventInit)
    )
}

describe("Reorder.Group", () => {
    beforeEach(() => {
        document.body.style.margin = "0"
    })

    test("reorders more than once with a store array changed in place", async () => {
        const [state, setState] = createStore({ items: [1, 2, 3] })
        const onReorder = vi.fn((values: number[]) =>
            setState((draft) => {
                draft.items.splice(0, draft.items.length, ...values)
            })
        )

        const { container, unmount } = render(() => (
            <Reorder.Group
                values={state.items}
                onReorder={onReorder}
                style={{ margin: 0, padding: 0, "list-style": "none" }}
            >
                <For each={state.items}>
                    {(item) => (
                        <Reorder.Item
                            value={item}
                            data-item={item}
                            style={{ height: 40 }}
                        >
                            {item}
                        </Reorder.Item>
                    )}
                </For>
            </Reorder.Group>
        ))
        const order = () =>
            Array.from(container.querySelectorAll("li")).map(
                (li) => li.dataset.item
            )
        const first = container.querySelector("[data-item='1']")!
        await nextFrame()
        await nextFrame()

        pointer("pointerdown", first, 10, 10)
        await nextFrame()
        for (let y = 20; y <= 110; y += 10) {
            pointer("pointermove", window, 10, y)
            await nextFrame()
        }
        pointer("pointerup", window, 10, 110)

        expect(onReorder.mock.calls.length).toBeGreaterThanOrEqual(2)
        expect([...state.items]).toEqual([2, 3, 1])
        expect(order()).toEqual(["2", "3", "1"])
        unmount()
    })

    test("a group removed mid-drag doesn't leave its auto-scroll limit behind", async () => {
        const [group, setGroup] = createSignal<"a" | "b">("a")
        const List = (props: { values: number[] }) => (
            <Reorder.Group
                values={props.values}
                onReorder={() => {}}
                style={{ margin: 0, padding: 0, "list-style": "none" }}
            >
                <For each={props.values}>
                    {(item) => (
                        <Reorder.Item value={item} style={{ height: 50 }}>
                            {item}
                        </Reorder.Item>
                    )}
                </For>
            </Reorder.Group>
        )

        const { container, unmount } = render(() => (
            <div id="scroller" style={{ height: "200px", overflow: "auto" }}>
                <Show
                    when={group() === "a"}
                    fallback={<List values={[...Array(12).keys()]} />}
                >
                    <List values={[...Array(6).keys()]} />
                </Show>
            </div>
        ))
        const scroller = container.querySelector("#scroller") as HTMLElement
        const dragToBottom = async (target: Element, from: number) => {
            pointer("pointerdown", target, 10, from)
            await nextFrame()
            for (let y = from + 10; y <= 195; y += 10) {
                pointer("pointermove", window, 10, y)
                await nextFrame()
            }
            for (let i = 0; i < 30; i++) {
                pointer("pointermove", window, 10, 196 + (i % 2))
                await nextFrame()
            }
        }
        await nextFrame()
        await nextFrame()

        // Auto-scrolls group "a" to its limit (100), and removes it mid-drag.
        await dragToBottom(scroller.querySelector("li")!, 10)
        expect(scroller.scrollTop).toBeGreaterThan(0)
        setGroup("b")
        flush()
        pointer("pointerup", window, 10, 196)
        await nextFrame()
        await nextFrame()

        // Group "b" is taller: dragged from the edge, it auto-scrolls past "a"'s limit.
        const start = scroller.scrollTop
        await dragToBottom(document.elementFromPoint(10, 170)!, 170)
        pointer("pointerup", window, 10, 196)
        expect(scroller.scrollTop).toBeGreaterThan(Math.max(start, 100))
        unmount()
    })

    test("removing an item whose drag was cancelled keeps another group's auto-scroll", async () => {
        const [showA, setShowA] = createSignal(true)
        let controls!: ReturnType<typeof useDragControls>
        const List = (props: { values: number[]; dragControls?: any }) => (
            <Reorder.Group
                values={props.values}
                onReorder={() => {}}
                style={{ margin: 0, padding: 0, "list-style": "none" }}
            >
                <For each={props.values}>
                    {(item) => (
                        <Reorder.Item
                            value={item}
                            dragControls={props.dragControls}
                            style={{ height: "50px" }}
                        >
                            {item}
                        </Reorder.Item>
                    )}
                </For>
            </Reorder.Group>
        )
        const scrollerStyle = (left: number) => ({
            position: "absolute" as const,
            top: "0px",
            left: `${left}px`,
            width: "200px",
            height: "200px",
            overflow: "auto",
        })

        const { container, unmount } = render(() => {
            controls = useDragControls()
            return (
                <>
                    <div id="b" style={scrollerStyle(0)}>
                        <List values={[...Array(20).keys()]} />
                    </div>
                    <div style={scrollerStyle(220)}>
                        <Show when={showA()}>
                            <List values={[0, 1, 2]} dragControls={controls} />
                        </Show>
                    </div>
                </>
            )
        })
        const scrollerB = container.querySelector("#b") as HTMLElement
        await nextFrame()
        await nextFrame()

        // Drag an item of A, cancelled with its drag controls.
        pointer("pointerdown", document.elementFromPoint(230, 10)!, 230, 10)
        await nextFrame()
        for (let y = 20; y <= 60; y += 10) {
            pointer("pointermove", window, 230, y)
            await nextFrame()
        }
        controls.cancel()
        pointer("pointerup", window, 230, 60)
        await nextFrame()

        // Drag an item of B to its scroller's edge: it auto-scrolls.
        pointer("pointerdown", scrollerB.querySelector("li")!, 10, 10)
        await nextFrame()
        for (let y = 20; y <= 190; y += 10) {
            pointer("pointermove", window, 10, y)
            await nextFrame()
        }
        expect(scrollerB.scrollTop).toBeGreaterThan(0)

        // Held still (no velocity), it keeps auto-scrolling.
        for (let i = 0; i < 15; i++) {
            pointer("pointermove", window, 10, 190)
            await nextFrame()
        }

        // Removing A doesn't reset B's auto-scroll (it'd need a velocity to start again).
        setShowA(false)
        flush()
        const before = scrollerB.scrollTop
        for (let i = 0; i < 5; i++) {
            pointer("pointermove", window, 10, 190)
            await nextFrame()
        }
        pointer("pointerup", window, 10, 190)
        expect(scrollerB.scrollTop).toBeGreaterThan(before)
        unmount()
    })
})
