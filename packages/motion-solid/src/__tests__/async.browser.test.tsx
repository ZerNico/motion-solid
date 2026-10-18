import { render } from "@solidjs/testing-library"
import {
    action,
    createMemo,
    createOptimisticStore,
    createSignal,
    flush,
    Loading,
    refresh,
} from "solid-js"
import { AnimatePresence, For, motion, Show } from ".."

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const opacity = (element: Element) => Number(getComputedStyle(element).opacity)

/**
 * Solid 2 async: pending reads in props and control flow, held transitions, optimistic updates.
 */
describe("Solid 2 async", () => {
    beforeEach(() => {
        document.body.style.margin = "0"
    })

    test("async values in motion props: suspends, then animates; later changes are held", async () => {
        const [id, setId] = createSignal(1)
        const resolvers = new Map<number, (x: number) => void>()
        const target = createMemo(
            () => new Promise<number>((resolve) => resolvers.set(id(), resolve))
        )

        const { container } = render(() => (
            <Loading fallback={<p id="fallback" />}>
                <motion.div
                    id="box"
                    initial={{ x: 0 }}
                    animate={{ x: target() }}
                    transition={{ duration: 0.05 }}
                />
            </Loading>
        ))
        expect(container.querySelector("#fallback")).not.toBeNull()

        resolvers.get(1)!(100)
        await vi.waitFor(() =>
            expect(
                (container.querySelector("#box") as HTMLElement)?.style
                    .transform
            ).toBe("translateX(100px)")
        )
        const box = container.querySelector("#box") as HTMLElement

        setId(2)
        flush()
        await sleep(100)
        // Held: the previous target stays.
        expect(box.style.transform).toBe("translateX(100px)")

        resolvers.get(2)!(200)
        await vi.waitFor(() =>
            expect(box.style.transform).toBe("translateX(200px)")
        )
        expect(container.querySelector("#box")).toBe(box)
    })

    test("Show with an async `when`: the swap waits for the data, then exits/enters", async () => {
        const [id, setId] = createSignal<number | null>(1)
        const resolvers = new Map<number, (name: string) => void>()
        const user = createMemo(() => {
            const current = id()
            if (current === null) return null
            if (current === 1) return { name: "one" }
            return new Promise<{ name: string }>((resolve) =>
                resolvers.set(current, (name) => resolve({ name }))
            )
        })

        const { container } = render(() => (
            <Loading fallback={<p id="fallback" />}>
                <AnimatePresence mode="wait">
                    <Show when={user()} keyed>
                        {(u) => (
                            <motion.div
                                data-name={u.name}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.08 }}
                            />
                        )}
                    </Show>
                </AnimatePresence>
            </Loading>
        ))
        const names = () =>
            Array.from(
                container.querySelectorAll<HTMLElement>("[data-name]")
            ).map((element) => element.dataset.name)
        await sleep(120)
        expect(names()).toEqual(["one"])

        setId(2)
        flush()
        await sleep(150)
        // Held: no fallback (content was shown before), the old child stays and doesn't exit.
        expect(container.querySelector("#fallback")).toBeNull()
        expect(names()).toEqual(["one"])
        expect(opacity(container.querySelector("[data-name=one]")!)).toBe(1)

        resolvers.get(2)!("two")
        await vi.waitFor(() => expect(names()).toEqual(["two"]))
        await vi.waitFor(() =>
            expect(opacity(container.querySelector("[data-name=two]")!)).toBe(1)
        )

        setId(null)
        flush()
        await vi.waitFor(() => expect(names()).toEqual([]))
    })

    test("layout: a sibling created by a held update animates when it lands", async () => {
        const [count, setCount] = createSignal(1)
        let resolve!: (value: number) => void
        const items = createMemo(() =>
            count() === 1
                ? [1]
                : new Promise<number[]>(
                      (done) =>
                          (resolve = (n) =>
                              done(Array.from({ length: n }, (_, i) => i + 1)))
                  )
        )

        const { container } = render(() => (
            <Loading fallback="loading">
                <motion.div>
                    <motion.div
                        id="header"
                        layout
                        transition={{ duration: 0.5, ease: "linear" }}
                        style={{ height: 20 }}
                    />
                    <For each={items()}>
                        {(item) => (
                            <motion.div
                                data-item={item}
                                style={{ height: 20 }}
                            />
                        )}
                    </For>
                    <motion.div
                        id="footer"
                        layout
                        transition={{ duration: 0.5, ease: "linear" }}
                        style={{ height: 20 }}
                    />
                </motion.div>
            </Loading>
        ))
        await nextFrame()
        const footer = container.querySelector("#footer")!
        const top = footer.getBoundingClientRect().top

        setCount(3)
        flush()
        await sleep(50)
        expect(footer.getBoundingClientRect().top).toBe(top)

        resolve(3)
        await sleep(0)
        flush()
        await nextFrame()
        await nextFrame()

        const now = footer.getBoundingClientRect().top
        expect(now).toBeGreaterThan(top)
        expect(now).toBeLessThan(top + 38)
        await vi.waitFor(
            () => expect(footer.getBoundingClientRect().top).toBe(top + 40),
            { timeout: 2000 }
        )
    })

    test("optimistic add enters right away and stays when the action settles", async () => {
        let serverItems = [1, 2]
        let releaseServer!: () => void
        const [items, setOptimisticItems] = createOptimisticStore(
            async () => [...serverItems],
            [] as number[]
        )
        const add = action(function* (item: number) {
            setOptimisticItems((draft) => {
                draft.push(item)
            })
            yield new Promise<void>((done) => (releaseServer = done))
            serverItems = [...serverItems, item]
            refresh(items)
        })

        const { container } = render(() => (
            <Loading fallback="loading">
                <ul>
                    <AnimatePresence>
                        <For each={items} keyed={(item) => item}>
                            {(item) => (
                                <motion.li
                                    data-item={item()}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.05 }}
                                />
                            )}
                        </For>
                    </AnimatePresence>
                </ul>
            </Loading>
        ))
        await vi.waitFor(() =>
            expect(container.querySelectorAll("li")).toHaveLength(2)
        )

        add(3)
        flush()
        await vi.waitFor(() =>
            expect(container.querySelector("[data-item='3']")).not.toBeNull()
        )
        const added = container.querySelector("[data-item='3']")!
        await vi.waitFor(() => expect(opacity(added)).toBe(1))

        releaseServer()
        await sleep(200)
        // Same element: no exit and re-enter when the optimistic value is replaced.
        expect(container.querySelectorAll("[data-item='3']")).toHaveLength(1)
        expect(container.querySelector("[data-item='3']")).toBe(added)
        expect(opacity(added)).toBe(1)
    })

    test("a failed optimistic add exits when it's reverted", async () => {
        const [items, setOptimisticItems] = createOptimisticStore(
            async () => [1],
            [] as number[]
        )
        let rejectServer!: () => void
        const add = action(function* (item: number) {
            setOptimisticItems((draft) => {
                draft.push(item)
            })
            try {
                yield new Promise<void>((_, fail) => (rejectServer = fail))
            } catch {}
        })

        const { container } = render(() => (
            <Loading fallback="loading">
                <ul>
                    <AnimatePresence>
                        <For each={items} keyed={(item) => item}>
                            {(item) => (
                                <motion.li
                                    data-item={item()}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                />
                            )}
                        </For>
                    </AnimatePresence>
                </ul>
            </Loading>
        ))
        await vi.waitFor(() =>
            expect(container.querySelectorAll("li")).toHaveLength(1)
        )

        add(2)
        flush()
        await vi.waitFor(() =>
            expect(container.querySelector("[data-item='2']")).not.toBeNull()
        )
        const added = container.querySelector("[data-item='2']")!

        rejectServer()
        await vi.waitFor(() => expect(opacity(added)).toBeLessThan(1))
        expect(added.isConnected).toBe(true)
        await vi.waitFor(() => expect(added.isConnected).toBe(false))
    })
})
