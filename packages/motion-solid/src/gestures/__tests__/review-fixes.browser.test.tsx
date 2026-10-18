import { render } from "@solidjs/testing-library"
import { createSignal, flush, Show } from "solid-js"
import { motion, MotionConfig, motionValue } from "../.."

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
            pageX: x + window.scrollX,
            pageY: y + window.scrollY,
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

describe("drag (review fixes)", () => {
    beforeEach(() => {
        document.body.style.margin = "0"
    })

    afterEach(() => {
        document.body.style.height = ""
        window.scrollTo(0, 0)
    })

    test("removing an element mid-drag ends its drag: listeners and the drag lock are released", async () => {
        const [showFirst, setShowFirst] = createSignal(true)
        const onDragFirst = vi.fn()
        const onDragStartSecond = vi.fn()
        const { container } = render(() => (
            <>
                <Show when={showFirst()}>
                    <motion.div
                        data-testid="first"
                        drag
                        dragMomentum={false}
                        onDrag={onDragFirst}
                        style={{ width: 50, height: 50 }}
                    />
                </Show>
                <motion.div
                    data-testid="second"
                    drag
                    dragMomentum={false}
                    onDragStart={onDragStartSecond}
                    style={{ width: 50, height: 50 }}
                />
            </>
        ))
        await nextFrame()
        const first = container.querySelector("[data-testid='first']")!
        const second = container.querySelector("[data-testid='second']")!

        pointer("pointerdown", first, 10, 10)
        await nextFrame()
        pointer("pointermove", window, 30, 30)
        await nextFrame()
        pointer("pointermove", window, 40, 40)
        await nextFrame()
        await nextFrame()
        expect(onDragFirst).toHaveBeenCalled()

        // Removed while it's being dragged, without a pointerup.
        setShowFirst(false)
        flush()
        await nextFrame()
        onDragFirst.mockClear()

        pointer("pointermove", window, 60, 60)
        await nextFrame()
        await nextFrame()
        expect(onDragFirst).not.toHaveBeenCalled()

        // Another element can start dragging (the removed one released the drag lock).
        pointer("pointerdown", second, 10, 60)
        await nextFrame()
        pointer("pointermove", window, 30, 80)
        await nextFrame()
        pointer("pointermove", window, 40, 90)
        await nextFrame()
        await nextFrame()
        pointer("pointerup", window, 40, 90)
        await nextFrame()
        expect(onDragStartSecond).toHaveBeenCalledTimes(1)
        expect(onDragFirst).not.toHaveBeenCalled()
    })

    test("window scroll during a drag is compensated with a transformPagePoint", async () => {
        document.body.style.height = "3000px"
        const y = motionValue(0)
        const { container } = render(() => (
            <MotionConfig
                // A new point, like real transforms (`transformViewBoxPoint`, ...)
                transformPagePoint={({ x, y }) => ({ x, y })}
            >
                <motion.div
                    drag
                    dragMomentum={false}
                    style={{ width: 50, height: 50, y }}
                />
            </MotionConfig>
        ))
        await nextFrame()
        const element = container.querySelector("div")!

        pointer("pointerdown", element, 10, 10)
        await nextFrame()
        pointer("pointermove", window, 10, 20)
        await nextFrame()
        pointer("pointermove", window, 10, 30)
        await nextFrame()
        await nextFrame()
        expect(y.get()).toBe(20)

        // The pointer doesn't move on screen, but the page scrolls under it.
        window.scrollTo(0, 100)
        await vi.waitFor(() => expect(y.get()).toBe(120), { timeout: 1000 })

        pointer("pointerup", window, 10, 30)
        await nextFrame()
    })

    test("element scroll during a drag is scaled by a transformPagePoint", async () => {
        const y = motionValue(0)
        const { container } = render(() => (
            <MotionConfig
                // Page space to a space at half the scale (like an SVG viewBox)
                transformPagePoint={({ x, y }) => ({ x: x / 2, y: y / 2 })}
            >
                <div
                    data-scroller
                    style={{ height: "200px", overflow: "auto" }}
                >
                    <div style={{ height: "2000px" }}>
                        <motion.div
                            data-draggable
                            drag
                            dragMomentum={false}
                            style={{ width: 50, height: 50, y }}
                        />
                    </div>
                </div>
            </MotionConfig>
        ))
        await nextFrame()
        const scroller = container.querySelector(
            "[data-scroller]"
        ) as HTMLElement
        const element = scroller.querySelector(
            "[data-draggable]"
        ) as HTMLElement

        pointer("pointerdown", element, 10, 10)
        await nextFrame()
        pointer("pointermove", window, 10, 20)
        await nextFrame()
        pointer("pointermove", window, 10, 30)
        await nextFrame()
        await nextFrame()
        expect(y.get()).toBe(10)

        // The content scrolls 100px under the pointer: 50 in the transformed space.
        scroller.scrollTop = 100
        await vi.waitFor(() => expect(y.get()).toBe(60), { timeout: 1000 })

        pointer("pointerup", window, 10, 30)
        await nextFrame()
    })
})
