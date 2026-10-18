import { render } from "@solidjs/testing-library"
import { createMemo, createSignal, flush, Loading, Show } from "solid-js"
import {
    AnimatePresence,
    For as PresenceFor,
    motion,
    Show as PresenceShow,
    visualElementStore,
} from "../.."

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const frames = async (count: number) => {
    for (let i = 0; i < count; i++) await nextFrame()
}

function pointer(
    type:
        | "pointerdown"
        | "pointermove"
        | "pointerup"
        | "pointerenter"
        | "pointerleave",
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

/**
 * Regressions for layout issues found in review.
 */
describe("layout animations (review fixes)", () => {
    beforeEach(() => {
        document.body.style.margin = "0"
    })

    test("`layout` turned off and on again animates again", async () => {
        const [layout, setLayout] = createSignal(true)
        const [wide, setWide] = createSignal(false)

        const { container } = render(() => (
            <motion.div
                layout={layout()}
                transition={{ duration: 0.5, ease: "linear" }}
                style={{ width: wide() ? 200 : 100, height: 50 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        await frames(2)

        setLayout(false)
        flush()
        await frames(2)
        setLayout(true)
        flush()
        await frames(2)

        setWide(true)
        flush()
        await frames(2)

        await vi.waitFor(() => {
            expect(element.style.transform).toMatch(/scale/)
            expect(element.getBoundingClientRect().width).toBeLessThan(195)
        })
    })

    test("`layout` turned on after mounting without it animates", async () => {
        const [layout, setLayout] = createSignal(false)
        const [wide, setWide] = createSignal(false)

        const { container } = render(() => (
            <motion.div
                layout={layout()}
                transition={{ duration: 0.5, ease: "linear" }}
                style={{ width: wide() ? 200 : 100, height: 50 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        await frames(2)

        setLayout(true)
        flush()
        await frames(2)

        setWide(true)
        flush()
        await frames(2)

        await vi.waitFor(() => {
            expect(element.style.transform).toMatch(/scale/)
            expect(element.getBoundingClientRect().width).toBeLessThan(195)
        })
    })

    test("with `drag`, `layout` follows its prop: turned on animates", async () => {
        const [layout, setLayout] = createSignal(false)
        const [wide, setWide] = createSignal(false)

        const { container } = render(() => (
            <motion.div
                drag
                layout={layout()}
                transition={{ duration: 0.5, ease: "linear" }}
                style={{ width: wide() ? 200 : 100, height: 50 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        await frames(2)

        setLayout(true)
        flush()
        await frames(2)

        setWide(true)
        flush()
        await frames(2)

        await vi.waitFor(() => {
            expect(element.style.transform).toMatch(/scale/)
            expect(element.getBoundingClientRect().width).toBeLessThan(195)
        })
    })

    test("with `drag`, `layout` follows its prop: turned off doesn't animate", async () => {
        const [layout, setLayout] = createSignal(true)
        const [wide, setWide] = createSignal(false)

        const { container } = render(() => (
            <motion.div
                drag
                layout={layout()}
                transition={{ duration: 0.5, ease: "linear" }}
                style={{ width: wide() ? 200 : 100, height: 50 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        await frames(2)

        setLayout(false)
        flush()
        await frames(2)

        setWide(true)
        flush()
        await frames(4)

        expect(element.style.transform).not.toMatch(/scale/)
        expect(element.getBoundingClientRect().width).toBe(200)
    })

    test("an element without `layout` doesn't animate its layout", async () => {
        const [tall, setTall] = createSignal(false)
        const onLayoutAnimationStart = vi.fn()

        // A scaled ancestor of a layout child gets snapshot when the child is measured.
        render(() => (
            <motion.div
                drag
                style={{ scale: 2, width: 300 }}
                onLayoutAnimationStart={onLayoutAnimationStart}
            >
                <motion.div
                    layout
                    style={{ width: 100, height: tall() ? 100 : 50 }}
                />
            </motion.div>
        ))
        await frames(2)

        setTall(true)
        flush()
        await frames(4)

        expect(onLayoutAnimationStart).not.toHaveBeenCalled()
    })

    test("a `layoutId` set after mounting joins its stack", async () => {
        const [id, setId] = createSignal<string>()

        const { container } = render(() => (
            <>
                <motion.div id="first" layoutId="box" />
                <motion.div id="second" layoutId={id()} />
            </>
        ))
        await frames(2)
        const projection = () =>
            visualElementStore.get(container.querySelector("#second")!)!
                .projection!

        setId("box")
        flush()
        await frames(2)

        expect(projection().getStack()?.members).toContain(projection())
        expect(projection().isLead()).toBe(true)
    })

    test("a `layoutId` that changes moves its element to the new stack", async () => {
        const [id, setId] = createSignal("a")
        const [shown, setShown] = createSignal(true)

        const { container } = render(() => (
            <Show when={shown()}>
                <motion.div id="box" layoutId={id()} />
            </Show>
        ))
        await frames(2)
        const projection = visualElementStore.get(
            container.querySelector("#box")!
        )!.projection!
        const stack = (layoutId: string) =>
            (projection.root as any).sharedNodes.get(layoutId)?.members ?? []

        setId("b")
        flush()
        await frames(2)
        expect(stack("a")).not.toContain(projection)
        expect(stack("b")).toContain(projection)

        setShown(false)
        flush()
        await frames(2)
        expect(stack("a")).not.toContain(projection)
        expect(stack("b")).not.toContain(projection)
    })

    test("changing `layoutId` mid-drag keeps the drag going", async () => {
        const [id, setId] = createSignal("a")
        const onDragEnd = vi.fn()

        const { container } = render(() => (
            <motion.div
                drag="x"
                dragMomentum={false}
                layoutId={id()}
                whileDrag={{ opacity: 0.5 }}
                onDragStart={() => setId("b")}
                onDragEnd={onDragEnd}
                style={{ width: 100, height: 100 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        const visualElement = visualElementStore.get(element)!
        await frames(2)

        pointer("pointerdown", element, 10, 10)
        for (let x = 20; x <= 60; x += 10) {
            pointer("pointermove", window, x, 10)
            await nextFrame()
        }
        expect(visualElement.getValue("x")!.get()).toBe(50)
        pointer("pointerup", window, 60, 10)
        await frames(2)

        expect(onDragEnd).toHaveBeenCalledTimes(1)
        expect(
            visualElement.animationState!.getState().whileDrag.isActive
        ).toBe(false)
    })

    test("changing `layoutId` while hovered keeps the hover", async () => {
        const [id, setId] = createSignal("a")

        const { container } = render(() => (
            <motion.div
                layoutId={id()}
                whileHover={{ opacity: 0.5 }}
                style={{ width: 100, height: 100 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        const visualElement = visualElementStore.get(element)!
        const isHovered = () =>
            visualElement.animationState!.getState().whileHover.isActive
        await frames(2)

        pointer("pointerenter", element, 10, 10)
        await frames(1)
        expect(isHovered()).toBe(true)
        setId("b")
        flush()
        await frames(1)
        pointer("pointerleave", element, 200, 200)
        await frames(1)
        expect(isHovered()).toBe(false)
    })

    test("a lead moved to another `layoutId` stack: the old stack animates from it", async () => {
        const [id, setId] = createSignal("a")
        const [shown, setShown] = createSignal(false)
        const box = (top: number) => ({
            position: "absolute" as const,
            top: `${top}px`,
            left: "0px",
            width: "50px",
            height: "50px",
        })

        const { container } = render(() => (
            <>
                <motion.div
                    id="first"
                    layoutId="a"
                    style={box(0)}
                    transition={{ duration: 1, ease: "linear" }}
                />
                <Show when={shown()}>
                    <motion.div
                        layoutId={id()}
                        style={box(100)}
                        transition={{ duration: 0.2, ease: "linear" }}
                    />
                </Show>
                <motion.div
                    layoutId="b"
                    style={box(300)}
                    transition={{ duration: 1, ease: "linear" }}
                />
            </>
        ))
        await frames(2)
        setShown(true)
        flush()
        await sleep(500)

        setId("b")
        flush()
        await frames(3)
        const top = container
            .querySelector("#first")!
            .getBoundingClientRect().top
        expect(top).toBeGreaterThan(50)
        expect(top).toBeLessThan(150)
    })

    test("`layout` turned on in the same update as a size change animates", async () => {
        const [on, setOn] = createSignal(false)

        const { container } = render(() => (
            <motion.div
                layout={on()}
                transition={{ duration: 0.5, ease: "linear" }}
                style={{ width: on() ? 200 : 100, height: 50 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        await frames(2)

        setOn(true)
        flush()
        await frames(2)
        expect(element.getBoundingClientRect().width).toBeLessThan(195)
    })

    test("with `drag`, `layout` turned on in the same update as a size change animates", async () => {
        const [on, setOn] = createSignal(false)

        const { container } = render(() => (
            <motion.div
                drag
                layout={on()}
                transition={{ duration: 0.5, ease: "linear" }}
                style={{ width: on() ? 200 : 100, height: 50 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        await frames(2)

        setOn(true)
        flush()
        await frames(2)
        expect(element.getBoundingClientRect().width).toBeLessThan(195)
    })

    test("toggling the measurement doesn't accumulate listeners", async () => {
        const [layout, setLayout] = createSignal(true)

        const { container } = render(() => (
            <motion.div layout={layout()} style={{ width: 100, height: 50 }} />
        ))
        const element = container.firstElementChild as HTMLElement
        await frames(2)

        for (let i = 0; i < 3; i++) {
            setLayout(false)
            flush()
            setLayout(true)
            flush()
        }
        await frames(1)

        const projection = visualElementStore.get(element)!.projection as any
        expect(
            projection.eventHandlers.get("animationComplete").getSize()
        ).toBe(1)
    })

    test("an exiting layout element stays not present when its scope snapshots", async () => {
        const [show, setShow] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence>
                <PresenceShow when={show()}>
                    <motion.div
                        layout
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{ width: 100, height: 50 }}
                    />
                </PresenceShow>
            </AnimatePresence>
        ))
        const element = container.firstElementChild as HTMLElement
        await frames(2)
        const projection = visualElementStore.get(element)!.projection!

        setShow(false)
        flush()

        expect(element.isConnected).toBe(true)
        expect(projection.isPresent).toBe(false)
    })

    test("creating an element in an update held by async snapshots when it lands", async () => {
        const [show, setShow] = createSignal(false)
        let resolve!: (value: string) => void
        const data = createMemo(() =>
            show() ? new Promise<string>((done) => (resolve = done)) : "none"
        )

        const { container } = render(() => (
            <>
                <Show when={show()}>
                    <motion.div id="new" style={{ height: 100 }} />
                </Show>
                <motion.div
                    id="box"
                    layout
                    transition={{ duration: 0.5, ease: "linear" }}
                    style={{ width: 100, height: 50 }}
                />
                <Loading fallback="loading">
                    <span>{data()}</span>
                </Loading>
            </>
        ))
        const box = container.querySelector("#box")!
        await frames(2)

        setShow(true)
        flush()
        await frames(2)
        expect(container.querySelector("#new")).toBe(null)
        expect(box.getBoundingClientRect().top).toBe(0)

        resolve("loaded")
        await sleep(0)
        flush()
        await frames(2)

        expect(container.querySelector("#new")).not.toBe(null)
        const top = box.getBoundingClientRect().top
        expect(top).toBeGreaterThan(0)
        expect(top).toBeLessThan(95)
        await vi.waitFor(
            () => expect(box.getBoundingClientRect().top).toBe(100),
            { timeout: 2000 }
        )
    })

    test("motion-solid's For animates reordered items under a plain parent", async () => {
        const [items, setItems] = createSignal([1, 2, 3])

        const { container } = render(() => (
            <ul style={{ margin: "0", padding: "0" }}>
                <PresenceFor each={items()}>
                    {(item) => (
                        <motion.li
                            layout
                            data-item={item}
                            transition={{ duration: 0.5, ease: "linear" }}
                            style={{ height: 20, display: "block" }}
                        />
                    )}
                </PresenceFor>
            </ul>
        ))
        const get = (item: number) =>
            container.querySelector(`[data-item="${item}"]`) as HTMLElement
        await frames(2)
        const top1 = get(1).getBoundingClientRect().top

        setItems([3, 2, 1])
        flush()
        await frames(2)

        await vi.waitFor(() => {
            expect(get(1).style.transform).not.toBe("")
            expect(get(1).style.transform).not.toBe("none")
            const now = get(1).getBoundingClientRect().top
            expect(now).toBeGreaterThan(top1)
            expect(now).toBeLessThan(top1 + 39)
        })
    })
})
