import { render } from "@solidjs/testing-library"
import { Portal } from "@solidjs/web"
import {
    createEffect,
    createMemo,
    createSignal,
    flush,
    Loading,
    onCleanup,
} from "solid-js"
import {
    AnimatePresence,
    For,
    motion,
    Show,
    usePresence,
    visualElementStore,
} from "../../.."

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const opacity = (element: Element) => Number(getComputedStyle(element).opacity)

describe("presence-aware Show/For", () => {
    test("Show: keeps the child until its exit finishes", async () => {
        const [show, setShow] = createSignal(true)
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <Show when={show()}>
                    <motion.div
                        id="child"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    />
                </Show>
            </AnimatePresence>
        ))
        const child = container.querySelector("#child")!

        setShow(false)
        flush()
        await vi.waitFor(() => expect(opacity(child)).toBeLessThan(1))
        expect(child.isConnected).toBe(true)

        await vi.waitFor(() => expect(child.isConnected).toBe(false))
        expect(onExitComplete).toHaveBeenCalledTimes(1)
    })

    test("Show: reactive content and owner stay alive while exiting, cleanups run after", async () => {
        const [show, setShow] = createSignal(true)
        const [count, setCount] = createSignal(0)
        const cleanedUp = vi.fn()

        const Content = () => {
            onCleanup(cleanedUp)
            return (
                <motion.div
                    id="child"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    {count()}
                </motion.div>
            )
        }

        const { container } = render(() => (
            <AnimatePresence>
                <Show when={show()}>
                    <Content />
                </Show>
            </AnimatePresence>
        ))
        const child = container.querySelector("#child")!

        setShow(false)
        flush()
        setCount(1)
        flush()
        expect(child.textContent).toBe("1")
        expect(cleanedUp).not.toHaveBeenCalled()

        await vi.waitFor(() => expect(child.isConnected).toBe(false))
        expect(cleanedUp).toHaveBeenCalledTimes(1)
    })

    test("Show: coming back while exiting reverses the same instance", async () => {
        const [show, setShow] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence>
                <Show when={show()}>
                    <motion.div
                        id="child"
                        exit={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    />
                </Show>
            </AnimatePresence>
        ))
        const child = container.querySelector("#child")!

        // Rapid toggling never stacks copies.
        for (let i = 0; i < 5; i++) {
            setShow(false)
            flush()
            await sleep(10)
            setShow(true)
            flush()
            await sleep(10)
        }

        expect(container.querySelectorAll("#child")).toHaveLength(1)
        expect(container.querySelector("#child")).toBe(child)
        await vi.waitFor(() => expect(opacity(child)).toBe(1))
        await sleep(300)
        expect(child.isConnected).toBe(true)
    })

    test("Show keyed + mode=wait: the next child enters after the previous exits", async () => {
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

        await sleep(150)
        setKey("b")
        flush()
        expect(keys()).toEqual(["a"])

        // Switching again while a exits: b is never rendered.
        setKey("c")
        flush()
        expect(keys()).toEqual(["a"])

        await vi.waitFor(() => expect(keys()).toEqual(["c"]))
        const c = container.querySelector("[data-key=c]")!
        await vi.waitFor(() => expect(opacity(c)).toBe(1))
    })

    test("Show fallback enters and exits too", async () => {
        const [show, setShow] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence mode="wait">
                <Show
                    when={show()}
                    fallback={
                        <motion.p
                            id="fallback"
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.05 }}
                        />
                    }
                >
                    <motion.div
                        id="content"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.05 }}
                    />
                </Show>
            </AnimatePresence>
        ))

        setShow(false)
        flush()
        expect(container.querySelector("#content")).not.toBeNull()
        await vi.waitFor(() =>
            expect(container.querySelector("#fallback")).not.toBeNull()
        )
        expect(container.querySelector("#content")).toBeNull()
    })

    test("For: removed items exit in place, re-added items reverse", async () => {
        const [items, setItems] = createSignal([1, 2, 3])

        const { container } = render(() => (
            <ul>
                <AnimatePresence>
                    <For each={items()}>
                        {(item) => (
                            <motion.li
                                data-item={item}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
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
        const two = container.querySelector("[data-item='2']")!

        setItems([1, 3, 4])
        flush()
        expect(order()).toEqual(["1", "2", "3", "4"])

        setItems([1, 2, 3, 4])
        flush()
        expect(container.querySelector("[data-item='2']")).toBe(two)

        setItems([1, 3, 4])
        flush()
        await vi.waitFor(() => expect(order()).toEqual(["1", "3", "4"]))
    })

    test("usePresence: isPresent is reactive and the exit waits for safeToRemove", async () => {
        const [show, setShow] = createSignal(true)
        const seen: boolean[] = []
        let remove!: () => void

        const Child = () => {
            const [isPresent, safeToRemove] = usePresence()
            remove = safeToRemove!
            createEffect(isPresent, (present) => {
                seen.push(present)
            })
            return <div id="child" />
        }

        const { container } = render(() => (
            <AnimatePresence>
                <Show when={show()}>
                    <Child />
                </Show>
            </AnimatePresence>
        ))

        setShow(false)
        flush()
        await sleep(50)
        expect(seen).toEqual([true, false])
        expect(container.querySelector("#child")).not.toBeNull()

        remove()
        await vi.waitFor(() =>
            expect(container.querySelector("#child")).toBeNull()
        )
    })

    test("portalled descendants exit with their child", async () => {
        const [show, setShow] = createSignal(true)

        render(() => (
            <AnimatePresence>
                <Show when={show()}>
                    <div>
                        <Portal>
                            <motion.div
                                id="portalled"
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            />
                        </Portal>
                    </div>
                </Show>
            </AnimatePresence>
        ))
        const portalled = document.getElementById("portalled")!

        setShow(false)
        flush()
        await vi.waitFor(() => expect(opacity(portalled)).toBeLessThan(1))
        expect(portalled.isConnected).toBe(true)
        await vi.waitFor(() => expect(portalled.isConnected).toBe(false))
    })

    test("propagate: nested exits run before the parent is removed", async () => {
        const [show, setShow] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence>
                <Show when={show()}>
                    <motion.div
                        id="outer"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.05 }}
                    >
                        <AnimatePresence propagate>
                            <motion.div
                                id="inner"
                                exit={{ x: 100 }}
                                transition={{ duration: 0.3 }}
                            />
                        </AnimatePresence>
                    </motion.div>
                </Show>
            </AnimatePresence>
        ))
        const outer = container.querySelector("#outer")!
        const inner = container.querySelector("#inner") as HTMLElement

        setShow(false)
        flush()
        await sleep(150)
        expect(outer.isConnected).toBe(true)
        expect(inner.style.transform).toMatch(/translateX/)
        await vi.waitFor(() => expect(outer.isConnected).toBe(false))
        expect(inner.style.transform).toBe("translateX(100px)")
    })

    test("nested AnimatePresence: the inner child keeps animating while the outer exits", async () => {
        const [show, setShow] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence>
                <Show when={show()}>
                    <motion.div
                        id="outer"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <AnimatePresence>
                            <motion.div
                                id="inner"
                                animate={{ x: 100 }}
                                transition={{ duration: 0.2 }}
                            />
                        </AnimatePresence>
                    </motion.div>
                </Show>
            </AnimatePresence>
        ))
        const inner = container.querySelector("#inner") as HTMLElement

        setShow(false)
        flush()
        await vi.waitFor(() =>
            expect(inner.style.transform).toBe("translateX(100px)")
        )
        expect(visualElementStore.get(inner)?.current).toBe(inner)
    })

    test("disposing AnimatePresence mid-exit leaves nothing behind", async () => {
        const [show, setShow] = createSignal(true)
        const styles = () => document.head.querySelectorAll("style").length
        const stylesBefore = styles()

        const { container, unmount } = render(() => (
            <AnimatePresence mode="popLayout">
                <Show when={show()}>
                    <motion.div
                        id="child"
                        layout
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        style={{ width: 50, height: 50 }}
                    />
                </Show>
            </AnimatePresence>
        ))
        const child = container.querySelector("#child")!
        const node = visualElementStore.get(child)!

        setShow(false)
        flush()
        await nextFrame()
        expect(styles()).toBe(stylesBefore + 1)

        unmount()
        await sleep(20)
        expect(styles()).toBe(stylesBefore)
        expect(node.current).toBeNull()
    })

    test("an abandoned async removal doesn't exit a child that stays present", async () => {
        const [show, setShow] = createSignal(true)
        let resolve!: (value: string) => void
        const data = createMemo(() =>
            show() ? "shown" : new Promise<string>((done) => (resolve = done))
        )

        const { container } = render(() => (
            <>
                <AnimatePresence>
                    <Show when={show()}>
                        <motion.div
                            id="child"
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.05 }}
                        />
                    </Show>
                </AnimatePresence>
                <Loading fallback="loading">
                    <span>{data()}</span>
                </Loading>
            </>
        ))
        const child = container.querySelector("#child")!

        setShow(false)
        flush()
        await sleep(0)
        setShow(true)
        flush()
        resolve("hidden")
        await sleep(150)

        expect(child.isConnected).toBe(true)
        expect(opacity(child)).toBe(1)
    })
})

/**
 * Port note: Solid-only. Upstream renders a child with nothing to finish before it's removed once
 * more and completes its exit from a layout effect. Here the list's diff counts that exit as
 * complete, so the child is removed in the update that removes it (see PORTING.md, "Solid dev
 * diagnostics"). What can be observed is the same.
 */
describe("exits with nothing to finish", () => {
    test("Show: the child is removed in the same flush, onExitComplete fires after it", async () => {
        const [show, setShow] = createSignal(true)
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <Show when={show()}>
                    <motion.div id="child" />
                </Show>
            </AnimatePresence>
        ))
        const child = container.querySelector("#child")!

        setShow(false)
        flush()
        expect(child.isConnected).toBe(false)
        expect(onExitComplete).not.toHaveBeenCalled()

        await Promise.resolve()
        expect(onExitComplete).toHaveBeenCalledTimes(1)
        await sleep(50)
        expect(onExitComplete).toHaveBeenCalledTimes(1)
    })

    test("For: they wait for the exits of their siblings, and are removed with them", async () => {
        const [items, setItems] = createSignal(["a", "b", "c"])
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <For each={items()}>
                    {(item) => (
                        <motion.div
                            data-key={item}
                            exit={item === "b" ? { opacity: 0 } : undefined}
                            transition={{ duration: 0.1 }}
                        />
                    )}
                </For>
            </AnimatePresence>
        ))
        const keys = () =>
            Array.from(
                container.querySelectorAll<HTMLElement>("[data-key]")
            ).map((element) => element.dataset.key)

        setItems([])
        flush()
        expect(keys()).toEqual(["a", "b", "c"])

        await vi.waitFor(() => expect(keys()).toEqual([]))
        await sleep(20)
        expect(onExitComplete).toHaveBeenCalledTimes(1)
    })

    test("sibling lists: the list without exit animations waits for the other's exits", async () => {
        const [show, setShow] = createSignal(true)
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <Show when={show()}>
                    <motion.div id="plain" />
                </Show>
                <Show when={show()}>
                    <motion.div
                        id="animated"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    />
                </Show>
            </AnimatePresence>
        ))
        const plain = container.querySelector("#plain")!
        const animated = container.querySelector("#animated")!

        setShow(false)
        flush()
        expect(plain.isConnected).toBe(true)

        await vi.waitFor(() => expect(animated.isConnected).toBe(false))
        expect(plain.isConnected).toBe(false)
        await sleep(20)
        expect(onExitComplete).toHaveBeenCalledTimes(1)
    })

    test("mode=wait: the next child enters in the same flush", async () => {
        const [key, setKey] = createSignal("a")
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
                <Show when={key()} keyed>
                    {(k) => <motion.div data-key={k} />}
                </Show>
            </AnimatePresence>
        ))
        const keys = () =>
            Array.from(
                container.querySelectorAll<HTMLElement>("[data-key]")
            ).map((element) => element.dataset.key)

        setKey("b")
        flush()
        expect(keys()).toEqual(["b"])
        await sleep(20)
        expect(onExitComplete).toHaveBeenCalledTimes(1)
    })

    test("propagate: a nested child with nothing to finish doesn't hold its parent", async () => {
        const [show, setShow] = createSignal(true)
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <Show when={show()}>
                    <motion.div
                        id="outer"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    >
                        <AnimatePresence propagate>
                            <Show when={true}>
                                <motion.div id="inner" />
                            </Show>
                        </AnimatePresence>
                    </motion.div>
                </Show>
            </AnimatePresence>
        ))
        const outer = container.querySelector("#outer")!

        setShow(false)
        flush()
        expect(outer.isConnected).toBe(true)
        await vi.waitFor(() => expect(outer.isConnected).toBe(false))
        await sleep(20)
        expect(onExitComplete).toHaveBeenCalledTimes(1)
    })

    test("a child that's added again later is a new one", async () => {
        const [items, setItems] = createSignal(["a", "b"])

        const { container } = render(() => (
            <AnimatePresence>
                <For each={items()}>
                    {(item) => <motion.div data-key={item} />}
                </For>
            </AnimatePresence>
        ))
        const first = container.querySelector("[data-key=b]")!

        setItems(["a"])
        flush()
        expect(first.isConnected).toBe(false)

        setItems(["a", "b"])
        flush()
        const second = container.querySelector("[data-key=b]")!
        expect(second).not.toBe(first)
        expect(second.isConnected).toBe(true)
    })
})
