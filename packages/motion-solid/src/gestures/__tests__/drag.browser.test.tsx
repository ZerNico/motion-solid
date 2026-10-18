import { render } from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import { motion, useDragControls } from "../.."

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

async function drag(
    element: Element,
    from: [number, number],
    to: [number, number],
    steps = 5
) {
    pointer("pointerdown", element, from[0], from[1])
    await nextFrame()
    for (let i = 1; i <= steps; i++) {
        const x = from[0] + ((to[0] - from[0]) * i) / steps
        const y = from[1] + ((to[1] - from[1]) * i) / steps
        pointer("pointermove", window, x, y)
        await nextFrame()
    }
    pointer("pointerup", window, to[0], to[1])
    await nextFrame()
    await nextFrame()
}

const position = (element: Element) => {
    const { left, top } = element.getBoundingClientRect()
    return [Math.round(left), Math.round(top)]
}

describe("drag", () => {
    beforeEach(() => {
        document.body.style.margin = "0"
    })

    test("drags the element with the pointer", async () => {
        const onDragStart = vi.fn()
        const onDragEnd = vi.fn()
        const { container } = render(() => (
            <motion.div
                drag
                dragMomentum={false}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                style={{ width: 50, height: 50 }}
            />
        ))
        const element = container.firstElementChild!
        await nextFrame()

        await drag(element, [10, 10], [110, 60])

        expect(position(element)).toEqual([100, 50])
        expect(onDragStart).toHaveBeenCalledTimes(1)
        expect(onDragEnd).toHaveBeenCalledTimes(1)
    })

    test('drag="x" only moves horizontally', async () => {
        const { container } = render(() => (
            <motion.div
                drag="x"
                dragMomentum={false}
                style={{ width: 50, height: 50 }}
            />
        ))
        const element = container.firstElementChild!
        await nextFrame()

        await drag(element, [10, 10], [110, 60])

        expect(position(element)).toEqual([100, 0])
    })

    test("dragConstraints as a box", async () => {
        const { container } = render(() => (
            <motion.div
                drag
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={{ left: 0, right: 40, top: 0, bottom: 20 }}
                style={{ width: 50, height: 50 }}
            />
        ))
        const element = container.firstElementChild!
        await nextFrame()

        await drag(element, [10, 10], [210, 210])

        expect(position(element)).toEqual([40, 20])
    })

    test("dragConstraints as an element (signal set by ref)", async () => {
        const [area, setArea] = createSignal<HTMLElement>()

        const { container } = render(() => (
            <div ref={setArea} style={{ width: "200px", height: "100px" }}>
                <motion.div
                    id="draggable"
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    dragConstraints={area}
                    style={{ width: 50, height: 50 }}
                />
            </div>
        ))
        const element = container.querySelector("#draggable")!
        await nextFrame()
        await nextFrame()

        await drag(element, [10, 10], [510, 510])

        expect(position(element)).toEqual([150, 50])
    })

    test("useDragControls starts a drag from another element", async () => {
        const Component = () => {
            const controls = useDragControls()
            return (
                <>
                    <div
                        id="handle"
                        onPointerDown={(event) => controls.start(event)}
                        style={{ width: "20px", height: "20px" }}
                    />
                    <motion.div
                        id="draggable"
                        drag
                        dragControls={controls}
                        dragListener={false}
                        dragMomentum={false}
                        style={{ width: 50, height: 50 }}
                    />
                </>
            )
        }
        const { container } = render(() => <Component />)
        const handle = container.querySelector("#handle")!
        const element = container.querySelector("#draggable")!
        await nextFrame()
        const [startX, startY] = position(element)

        // Dragging the element itself does nothing (dragListener={false}).
        await drag(element, [10, 30], [60, 30])
        expect(position(element)).toEqual([startX, startY])

        await drag(handle, [5, 5], [85, 5])
        expect(position(element)).toEqual([startX + 80, startY])
    })
})
