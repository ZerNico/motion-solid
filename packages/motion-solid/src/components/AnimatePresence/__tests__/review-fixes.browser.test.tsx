import { render } from "@solidjs/testing-library"
import {
    createSignal,
    flush,
    For as SolidFor,
    Show as SolidShow,
} from "solid-js"
import { AnimatePresence, For, motion, Show } from "../../.."

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("AnimatePresence: which Show/For join it", () => {
    test("a Show inside a presence child isn't governed by the outer AnimatePresence", async () => {
        const [inner, setInner] = createSignal(true)
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <Show when={true}>
                    <Show when={inner()}>
                        <motion.div
                            id="inner"
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        />
                    </Show>
                </Show>
            </AnimatePresence>
        ))

        setInner(false)
        flush()
        await sleep(50)
        expect(container.querySelector("#inner")).toBeNull()
        await sleep(350)
        expect(onExitComplete).not.toHaveBeenCalled()
    })

    test("a Show inside an element isn't governed by the AnimatePresence", async () => {
        const [inner, setInner] = createSignal(true)
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <div>
                    <Show when={inner()}>
                        <motion.div
                            id="inner"
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        />
                    </Show>
                </div>
            </AnimatePresence>
        ))

        setInner(false)
        flush()
        await sleep(50)
        expect(container.querySelector("#inner")).toBeNull()
        await sleep(350)
        expect(onExitComplete).not.toHaveBeenCalled()
    })

    test('mode="wait" doesn\'t apply to a keyed Show inside a presence child', async () => {
        const [key, setKey] = createSignal("a")

        const { container } = render(() => (
            <AnimatePresence mode="wait">
                <Show when={true}>
                    <Show when={key()} keyed>
                        {(k) => (
                            <motion.div
                                data-key={k}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            />
                        )}
                    </Show>
                </Show>
            </AnimatePresence>
        ))
        const keys = () =>
            Array.from(container.querySelectorAll("[data-key]")).map(
                (element) => (element as HTMLElement).dataset.key
            )

        setKey("b")
        flush()
        await sleep(50)
        expect(keys()).toEqual(["b"])
    })

    test("a Show returned by a component is a direct child", async () => {
        const [show, setShow] = createSignal(true)

        const Wrapper = () => (
            <Show when={show()}>
                <motion.div
                    id="child"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                />
            </Show>
        )

        const { container } = render(() => (
            <AnimatePresence>
                <Wrapper />
            </AnimatePresence>
        ))
        const child = container.querySelector("#child")!

        setShow(false)
        flush()
        await sleep(50)
        expect(child.isConnected).toBe(true)
        await vi.waitFor(() => expect(child.isConnected).toBe(false))
    })
})

describe("AnimatePresence: coordination across Show/For", () => {
    test('mode="wait": sibling Shows swap one after the other', async () => {
        const [a, setA] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence mode="wait">
                <Show when={a()}>
                    <motion.div
                        id="a"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                </Show>
                <Show when={!a()}>
                    <motion.div id="b" />
                </Show>
            </AnimatePresence>
        ))
        const first = container.querySelector("#a")!

        setA(false)
        flush()
        await sleep(50)
        expect(first.isConnected).toBe(true)
        expect(container.querySelector("#b")).toBeNull()

        await vi.waitFor(() =>
            expect(container.querySelector("#b")).not.toBeNull()
        )
        expect(first.isConnected).toBe(false)
    })

    test("exiting children of sibling Shows are removed together", async () => {
        const [show, setShow] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence>
                <Show when={show()}>
                    <motion.div
                        id="fast"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.05 }}
                    />
                </Show>
                <Show when={show()}>
                    <motion.div
                        id="slow"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    />
                </Show>
            </AnimatePresence>
        ))
        const fast = container.querySelector("#fast")!
        const slow = container.querySelector("#slow")!

        setShow(false)
        flush()
        await sleep(200)
        expect(fast.isConnected).toBe(true)
        await vi.waitFor(() => expect(slow.isConnected).toBe(false))
        expect(fast.isConnected).toBe(false)
    })
})

describe("AnimatePresence: onExitComplete", () => {
    test("fires once, after every exiting child is done", async () => {
        const [items, setItems] = createSignal(["plain", "animated"])
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <For each={items()}>
                    {(item) =>
                        item === "plain" ? (
                            <div id="plain" />
                        ) : (
                            <motion.div
                                id="animated"
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            />
                        )
                    }
                </For>
            </AnimatePresence>
        ))
        const animated = container.querySelector("#animated")!

        setItems([])
        flush()
        await sleep(50)
        expect(onExitComplete).not.toHaveBeenCalled()

        await vi.waitFor(() => expect(animated.isConnected).toBe(false))
        expect(onExitComplete).toHaveBeenCalledTimes(1)
    })

    test("doesn't fire when an exiting child comes back", async () => {
        const [show, setShow] = createSignal(true)
        const onExitComplete = vi.fn()

        render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <Show when={show()}>
                    <motion.div
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                </Show>
            </AnimatePresence>
        ))

        setShow(false)
        flush()
        await sleep(30)
        setShow(true)
        flush()
        await sleep(300)
        expect(onExitComplete).not.toHaveBeenCalled()
    })

    test("doesn't fire when AnimatePresence is disposed mid-exit", async () => {
        const [show, setShow] = createSignal(true)
        const onExitComplete = vi.fn()

        const { unmount } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <Show when={show()}>
                    <motion.div
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                </Show>
            </AnimatePresence>
        ))

        setShow(false)
        flush()
        await sleep(30)
        unmount()
        await sleep(300)
        expect(onExitComplete).not.toHaveBeenCalled()
    })

    test("doesn't fire when AnimatePresence is disposed after an exit completed", async () => {
        const [show, setShow] = createSignal(true)
        const onExitComplete = vi.fn()

        const { unmount } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <Show when={show()}>
                    <div />
                </Show>
            </AnimatePresence>
        ))

        // Nothing to animate: the exit completes in this flush, reported a microtask later.
        setShow(false)
        flush()
        unmount()
        await sleep(50)
        expect(onExitComplete).not.toHaveBeenCalled()
    })

    test("Solid's own Show: fires once after every exiting child is done", async () => {
        const [show, setShow] = createSignal(true)
        const onExitComplete = vi.fn()

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <SolidShow when={show()}>
                    <div id="plain" />
                </SolidShow>
                <SolidShow when={show()}>
                    <motion.div
                        id="animated"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                </SolidShow>
            </AnimatePresence>
        ))
        const animated = container.querySelector("#animated")!

        setShow(false)
        flush()
        await sleep(50)
        expect(onExitComplete).not.toHaveBeenCalled()
        await vi.waitFor(() => expect(animated.isConnected).toBe(false))
        expect(onExitComplete).toHaveBeenCalledTimes(1)
    })
})

describe("presence-aware For and Show", () => {
    test("For renders duplicate items", async () => {
        const [items, setItems] = createSignal([1, 1, 2])

        const { container } = render(() => (
            <AnimatePresence>
                <For each={items()}>
                    {(item) => (
                        <motion.div
                            class="item"
                            data-item={item}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.05 }}
                        />
                    )}
                </For>
            </AnimatePresence>
        ))
        const order = () =>
            Array.from(container.querySelectorAll(".item")).map(
                (element) => (element as HTMLElement).dataset.item
            )
        expect(order()).toEqual(["1", "1", "2"])

        setItems([1, 2])
        flush()
        await vi.waitFor(() => expect(order()).toEqual(["1", "2"]))

        setItems([1, 1, 1, 2])
        flush()
        expect(order()).toEqual(["1", "1", "1", "2"])
    })

    test("a duplicate that comes back while exiting keeps its child", async () => {
        const [items, setItems] = createSignal([1, 1, 2])
        let created = 0

        const { container } = render(() => (
            <AnimatePresence>
                <For each={items()}>
                    {(item) => {
                        created++
                        return (
                            <motion.div
                                class="item"
                                data-item={item}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            />
                        )
                    }}
                </For>
            </AnimatePresence>
        ))
        const order = () =>
            Array.from(container.querySelectorAll(".item")).map(
                (element) => (element as HTMLElement).dataset.item
            )
        expect(created).toBe(3)

        setItems([1, 2])
        flush()
        await sleep(50)
        expect(order()).toEqual(["1", "1", "2"])

        setItems([1, 1, 2])
        flush()
        expect(order()).toEqual(["1", "1", "2"])
        expect(created).toBe(3)

        await sleep(400)
        expect(order()).toEqual(["1", "1", "2"])
    })

    test("fallback is only created when it's shown, once", async () => {
        const created = vi.fn()
        const Fallback = (props: { id: string }) => {
            created(props.id)
            return <div id={props.id} />
        }
        const [show, setShow] = createSignal(false)
        const [items, setItems] = createSignal<number[]>([])

        const { container } = render(() => (
            <AnimatePresence>
                <Show when={show()} fallback={<Fallback id="show" />}>
                    <div />
                </Show>
                <For each={items()} fallback={<Fallback id="for" />}>
                    {(item) => <div>{item}</div>}
                </For>
            </AnimatePresence>
        ))
        expect(container.querySelector("#show")).not.toBeNull()
        expect(container.querySelector("#for")).not.toBeNull()
        expect(created.mock.calls).toEqual([["show"], ["for"]])

        setShow(true)
        setItems([1])
        flush()
        setShow(false)
        setItems([])
        flush()
        expect(created.mock.calls).toEqual([
            ["show"],
            ["for"],
            ["show"],
            ["for"],
        ])
    })
})

describe("Solid's own control flow inside AnimatePresence", () => {
    test("exiting children are removed together", async () => {
        const [show, setShow] = createSignal(true)

        const { container } = render(() => (
            <AnimatePresence>
                <SolidShow when={show()}>
                    <motion.div
                        id="fast"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.05 }}
                    />
                </SolidShow>
                <SolidFor each={show() ? [1] : []}>
                    {() => (
                        <motion.div
                            id="slow"
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        />
                    )}
                </SolidFor>
            </AnimatePresence>
        ))
        const fast = container.querySelector("#fast")!
        const slow = container.querySelector("#slow")!

        setShow(false)
        flush()
        await sleep(200)
        expect(fast.isConnected).toBe(true)
        await vi.waitFor(() => expect(slow.isConnected).toBe(false))
        expect(fast.isConnected).toBe(false)
    })
})

describe('AnimatePresence mode="wait" warning', () => {
    const message = `You're attempting to animate multiple children within AnimatePresence, but its mode is set to "wait". This will lead to odd visual behaviour.`

    // warnOnce warns once per message: the test that doesn't warn runs first.
    test("doesn't warn for one child at a time, across sibling lists", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
        const [a, setA] = createSignal(true)
        render(() => (
            <AnimatePresence mode="wait">
                <Show when={a()}>
                    <motion.div exit={{ opacity: 0 }} />
                    <motion.div exit={{ opacity: 0 }} />
                </Show>
                <Show when={!a()}>
                    <motion.div exit={{ opacity: 0 }} />
                </Show>
            </AnimatePresence>
        ))
        await sleep(20)
        setA(false)
        flush()
        await sleep(100)
        expect(warn).not.toHaveBeenCalledWith(message)
        warn.mockRestore()
    })

    test("warns when sibling lists render several children", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
        render(() => (
            <AnimatePresence mode="wait">
                <Show when={true}>
                    <motion.div />
                </Show>
                <For each={[1]}>{() => <motion.div />}</For>
            </AnimatePresence>
        ))
        await sleep(20)
        expect(warn).toHaveBeenCalledWith(message)
        warn.mockRestore()
    })
})
