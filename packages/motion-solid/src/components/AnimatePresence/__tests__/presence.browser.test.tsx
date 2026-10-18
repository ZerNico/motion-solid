import { render } from "@solidjs/testing-library"
import { createSignal, flush, For, Show } from "solid-js"
import { AnimatePresence, motion } from "../../.."

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

describe("AnimatePresence (Solid)", () => {
    test("keeps a removed child until its exit animation finishes", async () => {
        const [show, setShow] = createSignal(true)
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <Show when={show()}>
                    <motion.div
                        id="child"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    />
                </Show>
            </AnimatePresence>
        ))

        const child = container.querySelector("#child") as HTMLElement
        expect(child).not.toBeNull()

        setShow(false)
        flush()

        // Still in the document while exiting.
        expect(container.querySelector("#child")).toBe(child)
        await nextFrame()
        await nextFrame()
        expect(child.isConnected).toBe(true)

        await vi.waitFor(() => expect(child.isConnected).toBe(false))
        expect(child.style.opacity).toBe("0")
        expect(onExitComplete).toHaveBeenCalledTimes(1)
    })

    test("removes a child without exit animations right away", async () => {
        const [show, setShow] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence>
                <Show when={show()}>
                    <motion.div id="child" />
                </Show>
            </AnimatePresence>
        ))

        setShow(false)
        flush()
        await vi.waitFor(() =>
            expect(container.querySelector("#child")).toBeNull()
        )
    })

    test("exits list items in place", async () => {
        const [items, setItems] = createSignal([1, 2, 3])

        const { container } = render(() => (
            <ul>
                <AnimatePresence>
                    <For each={items()}>
                        {(item) => (
                            <motion.li
                                data-item={item}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                            />
                        )}
                    </For>
                </AnimatePresence>
            </ul>
        ))

        const order = () =>
            Array.from(container.querySelectorAll("li")).map(
                (li) => li.dataset.item
            )

        expect(order()).toEqual(["1", "2", "3"])

        setItems([1, 3, 4])
        flush()

        // The exiting item stays where it was.
        expect(order()).toEqual(["1", "2", "3", "4"])

        await vi.waitFor(() => expect(order()).toEqual(["1", "3", "4"]))
    })

    test("variants propagate exit to children", async () => {
        const [show, setShow] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence>
                <Show when={show()}>
                    <motion.div
                        id="parent"
                        initial="visible"
                        animate="visible"
                        exit="hidden"
                        variants={{ visible: {}, hidden: {} }}
                    >
                        <motion.span
                            id="child"
                            variants={{
                                visible: { opacity: 1 },
                                hidden: { opacity: 0 },
                            }}
                            transition={{ duration: 0.1 }}
                        />
                    </motion.div>
                </Show>
            </AnimatePresence>
        ))

        const parent = container.querySelector("#parent") as HTMLElement
        const child = container.querySelector("#child") as HTMLElement

        setShow(false)
        flush()

        await vi.waitFor(() => expect(parent.isConnected).toBe(false))
        expect(child.style.opacity).toBe("0")
    })

    test("initial={false} skips the initial animation of initial children", async () => {
        const [show, setShow] = createSignal(false)

        const { container } = render(() => (
            <AnimatePresence initial={false}>
                <motion.div
                    id="first"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                />
                <Show when={show()}>
                    <motion.div
                        id="second"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    />
                </Show>
            </AnimatePresence>
        ))

        const first = container.querySelector("#first") as HTMLElement
        expect(first.style.opacity).toBe("1")

        setShow(true)
        flush()
        const second = container.querySelector("#second") as HTMLElement
        expect(second.style.opacity).toBe("0")
        await vi.waitFor(() => expect(second.style.opacity).toBe("1"))
    })

    test('mode="wait" enters the next child after the previous one exits', async () => {
        const [key, setKey] = createSignal("a")

        const { container } = render(() => (
            <AnimatePresence mode="wait">
                <Show when={key()} keyed>
                    {(k) => (
                        <motion.div
                            data-key={k}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                        />
                    )}
                </Show>
            </AnimatePresence>
        ))

        const keys = () =>
            Array.from(
                container.querySelectorAll<HTMLElement>("[data-key]")
            ).map((element) => element.dataset.key)

        await vi.waitFor(() =>
            expect(
                (container.querySelector("[data-key=a]") as HTMLElement).style
                    .opacity
            ).toBe("1")
        )

        setKey("b")
        flush()
        expect(keys()).toEqual(["a"])

        await vi.waitFor(() => expect(keys()).toEqual(["b"]))
        const b = container.querySelector("[data-key=b]") as HTMLElement
        await vi.waitFor(() => expect(b.style.opacity).toBe("1"))
    })

    test("a child removed from inside a present child is removed right away", async () => {
        const [showInner, setShowInner] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence>
                <motion.div id="outer">
                    <Show when={showInner()}>
                        <motion.div
                            id="inner"
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        />
                    </Show>
                </motion.div>
            </AnimatePresence>
        ))

        setShowInner(false)
        flush()
        expect(container.querySelector("#inner")).toBeNull()
        expect(container.querySelector("#outer")).not.toBeNull()
    })
})
