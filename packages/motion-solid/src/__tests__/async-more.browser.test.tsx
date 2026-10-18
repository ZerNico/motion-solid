import { render } from "@solidjs/testing-library"
import {
    createMemo,
    createProjection,
    createSignal,
    flush,
    isPending,
    lazy,
    Loading,
    refresh,
    Reveal,
} from "solid-js"
import { AnimatePresence, For, motion, Show } from ".."

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const opacity = (element: Element) => Number(getComputedStyle(element).opacity)

/**
 * More Solid 2 async: `isPending`, `Reveal`, `lazy`, refreshed projections.
 */
describe("Solid 2 async (more)", () => {
    beforeEach(() => {
        document.body.style.margin = "0"
    })

    test("isPending drives animations and presence while a change is in flight", async () => {
        const [id, setId] = createSignal(1)
        const resolvers = new Map<number, (value: string) => void>()
        const data = createMemo(() => {
            const current = id()
            if (current === 1) return "one"
            return new Promise<string>((resolve) =>
                resolvers.set(current, resolve)
            )
        })

        const { container } = render(() => (
            <Loading fallback="loading">
                <motion.div
                    id="content"
                    animate={{ opacity: isPending(() => data()) ? 0.5 : 1 }}
                    transition={{ duration: 0.05 }}
                >
                    {data()}
                </motion.div>
                <AnimatePresence>
                    <Show when={isPending(() => data())}>
                        <motion.div
                            id="spinner"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.05 }}
                        />
                    </Show>
                </AnimatePresence>
            </Loading>
        ))
        const content = container.querySelector("#content")!
        expect(container.querySelector("#spinner")).toBeNull()

        setId(2)
        flush()
        await vi.waitFor(() => expect(opacity(content)).toBe(0.5))
        const spinner = container.querySelector("#spinner")!
        expect(spinner).not.toBeNull()
        await vi.waitFor(() => expect(opacity(spinner)).toBe(1))
        expect(content.textContent).toBe("one")

        resolvers.get(2)!("two")
        await vi.waitFor(() => expect(content.textContent).toBe("two"))
        await vi.waitFor(() => expect(opacity(content)).toBe(1))
        await vi.waitFor(() => expect(spinner.isConnected).toBe(false))
    })

    test("Reveal: content animates in when it's revealed, not before", async () => {
        let resolveA!: (value: string) => void
        let resolveB!: (value: string) => void
        const a = createMemo(
            () => new Promise<string>((resolve) => (resolveA = resolve))
        )
        const b = createMemo(
            () => new Promise<string>((resolve) => (resolveB = resolve))
        )

        const { container } = render(() => (
            <Reveal>
                <Loading fallback={<p id="fallback-a" />}>
                    <motion.div
                        id="a"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {a()}
                    </motion.div>
                </Loading>
                <Loading fallback={<p id="fallback-b" />}>
                    <motion.div
                        id="b"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {b()}
                    </motion.div>
                </Loading>
            </Reveal>
        ))

        // B resolves first, but is revealed after A.
        resolveB("b")
        await sleep(300)
        expect(container.querySelector("#b")).toBeNull()

        resolveA("a")
        await vi.waitFor(() =>
            expect(container.querySelector("#b")).not.toBeNull()
        )
        const element = container.querySelector("#b")!
        // It starts its initial animation now, not while it was waiting.
        expect(opacity(element)).toBeLessThan(1)
        await vi.waitFor(() => expect(opacity(element)).toBe(1))
    })

    test("lazy components inside motion elements join their variants once loaded", async () => {
        let load!: () => void
        const Lazy = lazy(
            () =>
                new Promise<{ default: () => any }>((resolve) => {
                    load = () =>
                        resolve({
                            default: () => (
                                <motion.span
                                    id="child"
                                    variants={{
                                        hidden: { opacity: 0 },
                                        visible: { opacity: 1 },
                                    }}
                                    transition={{ duration: 0.1 }}
                                />
                            ),
                        })
                })
        )

        const { container } = render(() => (
            <motion.div
                id="parent"
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: {} }}
            >
                <Loading fallback={<p id="fallback" />}>
                    <Lazy />
                </Loading>
            </motion.div>
        ))
        expect(container.querySelector("#fallback")).not.toBeNull()

        load()
        await vi.waitFor(() =>
            expect(container.querySelector("#child")).not.toBeNull()
        )
        const child = container.querySelector("#child")!
        expect(opacity(child)).toBeLessThan(1)
        await vi.waitFor(() => expect(opacity(child)).toBe(1))
    })

    test("a refreshed projection reorders and removes items with layout and exit animations", async () => {
        type Item = { id: number; label: string }
        let server: Item[] = [
            { id: 1, label: "one" },
            { id: 2, label: "two" },
            { id: 3, label: "three" },
        ]
        const items = createProjection<Item[]>(
            async () => server.map((item) => ({ ...item })),
            [],
            { key: "id" }
        )

        const { container } = render(() => (
            <Loading fallback="loading">
                <motion.ul style={{ margin: 0, padding: 0 }}>
                    <AnimatePresence>
                        <For each={items} keyed={(item) => item.id}>
                            {(item) => (
                                <motion.li
                                    layout
                                    data-id={item().id}
                                    exit={{ opacity: 0 }}
                                    transition={{
                                        duration: 0.4,
                                        ease: "linear",
                                    }}
                                    style={{ height: 20, "list-style": "none" }}
                                >
                                    {item().label}
                                </motion.li>
                            )}
                        </For>
                    </AnimatePresence>
                </motion.ul>
            </Loading>
        ))
        await vi.waitFor(() =>
            expect(container.querySelectorAll("li")).toHaveLength(3)
        )
        await nextFrame()
        const get = (id: number) =>
            container.querySelector(`[data-id='${id}']`) as HTMLElement
        const three = get(3)
        const two = get(2)
        const threeTop = three.getBoundingClientRect().top

        server = [
            { id: 3, label: "three!" },
            { id: 1, label: "one" },
        ]
        refresh(items)
        flush()

        await vi.waitFor(() => expect(three.textContent).toBe("three!"))
        await nextFrame()
        await nextFrame()

        // Same elements, updated in place.
        expect(get(3)).toBe(three)
        // 3 moved to the top: it's animating up from where it was.
        const now = three.getBoundingClientRect().top
        expect(now).toBeLessThan(threeTop)
        expect(now).toBeGreaterThan(threeTop - 38)
        // 2 is exiting.
        expect(two.isConnected).toBe(true)
        await vi.waitFor(() => expect(opacity(two)).toBeLessThan(1))

        await vi.waitFor(() => expect(two.isConnected).toBe(false), {
            timeout: 2000,
        })
        await vi.waitFor(
            () =>
                expect(Math.round(three.getBoundingClientRect().top)).toBe(
                    Math.round(threeTop - 40)
                ),
            { timeout: 2000 }
        )
    })
})
