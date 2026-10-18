import { render } from "@solidjs/testing-library"
import { createSignal, flush, For, Show } from "solid-js"
import { AnimatePresence, LayoutGroup, motion } from "../.."

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/**
 * Port note: upstream covers layout animations with Cypress, against real layout. These run in
 * the browser (Vitest browser mode) for the same reason.
 */
describe("layout animations (Solid)", () => {
    beforeEach(() => {
        document.body.style.margin = "0"
    })

    test("animates a size change from its own props", async () => {
        const [wide, setWide] = createSignal(false)

        const { container } = render(() => (
            <motion.div
                layout
                transition={{ duration: 0.5, ease: "linear" }}
                style={{ width: wide() ? 200 : 100, height: 50 }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        await nextFrame()

        setWide(true)
        flush()
        await nextFrame()
        await nextFrame()

        expect(element.getBoundingClientRect().width).toBeLessThan(195)
        expect(element.style.transform).toMatch(/scale/)

        await vi.waitFor(
            () => expect(element.getBoundingClientRect().width).toBe(200),
            { timeout: 2000 }
        )
    })

    test("animates siblings when a list in a motion element reorders", async () => {
        const [items, setItems] = createSignal([1, 2, 3])

        const { container } = render(() => (
            <motion.div>
                <For each={items()}>
                    {(item) => (
                        <motion.div
                            layout
                            data-item={item}
                            transition={{ duration: 0.5, ease: "linear" }}
                            style={{ height: 20 }}
                        />
                    )}
                </For>
            </motion.div>
        ))
        const get = (item: number) =>
            container.querySelector(`[data-item="${item}"]`) as HTMLElement
        await nextFrame()

        const top1 = get(1).getBoundingClientRect().top

        setItems([3, 2, 1])
        flush()
        await nextFrame()
        await nextFrame()

        // Item 1 moved from the top to the bottom, so it's animating down from the top.
        // (Waits, as browsers start the animation on different frames.)
        await vi.waitFor(() => {
            const now = get(1).getBoundingClientRect().top
            expect(now).toBeGreaterThan(top1)
            expect(now).toBeLessThan(top1 + 39)
        })
    })

    test("layoutDependency animates layout changes made outside the component", async () => {
        const [end, setEnd] = createSignal(false)

        const { container } = render(() => (
            <div
                style={{
                    display: "flex",
                    width: "300px",
                    "justify-content": end() ? "flex-end" : "flex-start",
                }}
            >
                <motion.div
                    id="handle"
                    layout
                    layoutDependency={end()}
                    transition={{ duration: 0.5, ease: "linear" }}
                    style={{ width: 50, height: 50 }}
                />
            </div>
        ))
        const handle = container.querySelector("#handle") as HTMLElement
        await nextFrame()

        setEnd(true)
        flush()
        await nextFrame()
        await nextFrame()

        const { left } = handle.getBoundingClientRect()
        expect(left).toBeGreaterThan(0)
        expect(left).toBeLessThan(245)

        await vi.waitFor(
            () => expect(handle.getBoundingClientRect().left).toBe(250),
            { timeout: 2000 }
        )
    })

    test("shared layoutId animates from the previous element", async () => {
        const [right, setRight] = createSignal(false)

        const { container } = render(() => (
            <LayoutGroup>
                <div style={{ display: "flex", width: "400px" }}>
                    <div style={{ width: "200px" }}>
                        <Show when={!right()}>
                            <motion.div
                                id="a"
                                layoutId="box"
                                transition={{ duration: 0.5, ease: "linear" }}
                                style={{ width: 50, height: 50 }}
                            />
                        </Show>
                    </div>
                    <div style={{ width: "200px" }}>
                        <Show when={right()}>
                            <motion.div
                                id="b"
                                layoutId="box"
                                transition={{ duration: 0.5, ease: "linear" }}
                                style={{ width: 50, height: 50 }}
                            />
                        </Show>
                    </div>
                </div>
            </LayoutGroup>
        ))
        await nextFrame()

        setRight(true)
        flush()
        await nextFrame()
        await nextFrame()

        const b = container.querySelector("#b") as HTMLElement
        const { left } = b.getBoundingClientRect()
        expect(left).toBeLessThan(195)

        await vi.waitFor(
            () => expect(b.getBoundingClientRect().left).toBe(200),
            { timeout: 2000 }
        )
    })

    test("shared layoutId crossfades with AnimatePresence", async () => {
        const [right, setRight] = createSignal(false)

        const { container } = render(() => (
            <div style={{ display: "flex", width: "400px" }}>
                <div style={{ width: "200px" }}>
                    <AnimatePresence>
                        <Show when={!right()}>
                            <motion.div
                                id="a"
                                layoutId="crossfade"
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5, ease: "linear" }}
                                style={{ width: 50, height: 50 }}
                            />
                        </Show>
                    </AnimatePresence>
                </div>
                <div style={{ width: "200px" }}>
                    <AnimatePresence>
                        <Show when={right()}>
                            <motion.div
                                id="b"
                                layoutId="crossfade"
                                transition={{ duration: 0.5, ease: "linear" }}
                                style={{ width: 50, height: 50 }}
                            />
                        </Show>
                    </AnimatePresence>
                </div>
            </div>
        ))
        await nextFrame()
        const a = container.querySelector("#a") as HTMLElement

        setRight(true)
        flush()
        await nextFrame()
        await nextFrame()

        const b = container.querySelector("#b") as HTMLElement
        expect(a.isConnected).toBe(true)
        expect(b.getBoundingClientRect().left).toBeLessThan(195)
        // The exiting element follows the new one.
        await vi.waitFor(() => {
            expect(a.getBoundingClientRect().left).toBeGreaterThan(5)
            expect(b.getBoundingClientRect().left).toBeLessThan(195)
        })

        await vi.waitFor(() => expect(a.isConnected).toBe(false), {
            timeout: 2000,
        })
        expect(b.getBoundingClientRect().left).toBe(200)
    })

    test("siblings animate when an AnimatePresence child is removed", async () => {
        const [items, setItems] = createSignal([1, 2, 3])

        const { container } = render(() => (
            <div>
                <AnimatePresence mode="popLayout">
                    <For each={items()}>
                        {(item) => (
                            <motion.div
                                layout
                                data-item={item}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5, ease: "linear" }}
                                style={{ height: 20 }}
                            />
                        )}
                    </For>
                </AnimatePresence>
            </div>
        ))
        const get = (item: number) =>
            container.querySelector(`[data-item="${item}"]`) as HTMLElement
        await nextFrame()
        const top3 = get(3).getBoundingClientRect().top

        setItems([2, 3])
        flush()
        await nextFrame()
        await nextFrame()

        // Item 1 popped out of the layout, so item 3 is moving up.
        const now = get(3).getBoundingClientRect().top
        expect(now).toBeLessThan(top3)
        expect(now).toBeGreaterThan(top3 - 19)
        expect(get(1).isConnected).toBe(true)

        await vi.waitFor(() => expect(get(1)).toBeNull(), { timeout: 2000 })
    })
})
