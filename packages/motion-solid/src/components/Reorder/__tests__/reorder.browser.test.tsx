import { render } from "@solidjs/testing-library"
import { createSignal, For } from "solid-js"
import { Reorder } from "../../.."

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

describe("Reorder", () => {
    beforeEach(() => {
        document.body.style.margin = "0"
    })

    test("dragging an item past another reorders the values", async () => {
        const [items, setItems] = createSignal([1, 2, 3])
        const onReorder = vi.fn((values: number[]) => setItems(values))

        const { container } = render(() => (
            <Reorder.Group
                values={items()}
                onReorder={onReorder}
                style={{ margin: 0, padding: 0, "list-style": "none" }}
            >
                <For each={items()}>
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
        for (let y = 20; y <= 70; y += 10) {
            pointer("pointermove", window, 10, y)
            await nextFrame()
        }

        expect(onReorder).toHaveBeenCalled()
        expect(onReorder.mock.calls.at(-1)![0]).toEqual([2, 1, 3])
        expect(order()).toEqual(["2", "1", "3"])

        pointer("pointerup", window, 10, 70)

        // Snaps into its new slot.
        await vi.waitFor(
            () =>
                expect(Math.round(first.getBoundingClientRect().top)).toBe(40),
            { timeout: 2000 }
        )
    })
})
