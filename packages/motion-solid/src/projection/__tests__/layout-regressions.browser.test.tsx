import { render } from "@solidjs/testing-library"
import { createMemo, createSignal, flush, Loading, Show } from "solid-js"
import {
    AnimatePresence,
    motion,
    Show as PresenceShow,
    visualElementStore,
} from "../.."

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Regressions for the issues found in review (see PORTING.md).
 */
describe("layout animations (regressions)", () => {
    beforeEach(() => {
        document.body.style.margin = "0"
    })

    test("animates an update held by async until it lands", async () => {
        const [wide, setWide] = createSignal(false)
        let resolve!: (value: string) => void
        const data = createMemo(() =>
            wide() ? new Promise<string>((done) => (resolve = done)) : "narrow"
        )

        const { container } = render(() => (
            <>
                <motion.div
                    id="box"
                    layout
                    layoutDependency={wide()}
                    transition={{ duration: 0.5, ease: "linear" }}
                    style={{ width: wide() ? 200 : 100, height: 50 }}
                />
                <Loading fallback="loading">
                    <span>{data()}</span>
                </Loading>
            </>
        ))
        const box = container.querySelector("#box")!
        await nextFrame()

        setWide(true)
        flush()
        await nextFrame()
        await nextFrame()
        expect(box.getBoundingClientRect().width).toBe(100)

        resolve("wide")
        await sleep(0)
        flush()
        await nextFrame()
        await nextFrame()

        const width = box.getBoundingClientRect().width
        expect(width).toBeGreaterThan(100)
        expect(width).toBeLessThan(190)
        await vi.waitFor(
            () => expect(box.getBoundingClientRect().width).toBe(200),
            { timeout: 2000 }
        )
    })

    test("doesn't read the props of components disposed in the same update", async () => {
        const [user, setUser] = createSignal<{ name: string } | null>({
            name: "a",
        })
        const errors: unknown[] = []
        const onError = (event: ErrorEvent) => errors.push(event.error)
        window.addEventListener("error", onError)

        const { container } = render(() => (
            <div>
                <motion.div animate={{ opacity: user() ? 1 : 0.5 }} />
                <Show when={user()}>
                    {(u) => <motion.div layout class={u().name} />}
                </Show>
            </div>
        ))
        await nextFrame()

        setUser(null)
        flush()
        await nextFrame()

        // Still reactive afterwards.
        setUser({ name: "b" })
        flush()
        expect(container.querySelector(".b")).not.toBeNull()

        window.removeEventListener("error", onError)
        expect(errors).toEqual([])
    })

    test("layout snapshots are scoped to the changed element's siblings", async () => {
        const [wide, setWide] = createSignal(false)

        const { container } = render(() => (
            <div>
                <motion.section>
                    <motion.div
                        layout
                        style={{ width: wide() ? 200 : 100, height: 20 }}
                    />
                </motion.section>
                <motion.section>
                    <motion.div id="other" layout style={{ height: 20 }} />
                </motion.section>
            </div>
        ))
        await nextFrame()
        const projection = visualElementStore.get(
            container.querySelector("#other")!
        )!.projection!
        const willUpdate = vi.spyOn(projection, "willUpdate")

        setWide(true)
        flush()
        await nextFrame()
        expect(willUpdate).not.toHaveBeenCalled()
    })

    test("animate-only changes don't snapshot anything", async () => {
        const [x, setX] = createSignal(0)

        const { container } = render(() => (
            <div>
                <motion.div animate={{ x: x() }} />
                <motion.div id="layout" layout style={{ height: 20 }} />
            </div>
        ))
        await nextFrame()
        const projection = visualElementStore.get(
            container.querySelector("#layout")!
        )!.projection!
        const willUpdate = vi.spyOn(projection, "willUpdate")

        setX(10)
        flush()
        await nextFrame()
        expect(willUpdate).not.toHaveBeenCalled()
    })

    test("layout={false} turns layout animations off again", async () => {
        const [layout, setLayout] = createSignal(true)
        const [wide, setWide] = createSignal(false)
        const onStart = vi.fn()

        const { container } = render(() => (
            <motion.div
                layout={layout()}
                onLayoutAnimationStart={onStart}
                transition={{ duration: 0.5 }}
                style={{ width: wide() ? 200 : 100, height: 50 }}
            />
        ))
        const element = container.firstElementChild!
        await nextFrame()

        setLayout(false)
        flush()
        await nextFrame()

        setWide(true)
        flush()
        await nextFrame()
        await nextFrame()

        expect(element.getBoundingClientRect().width).toBe(200)
        expect(onStart).not.toHaveBeenCalled()
    })

    test('shared layoutId with mode="wait": the outgoing element exits before the next one takes over', async () => {
        const [key, setKey] = createSignal("a")

        const { container } = render(() => (
            <AnimatePresence mode="wait">
                <PresenceShow when={key()} keyed>
                    {(k) => (
                        <motion.div
                            data-key={k}
                            layoutId="wait-shared"
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: "linear" }}
                            style={{ width: 50, height: 50 }}
                        />
                    )}
                </PresenceShow>
            </AnimatePresence>
        ))
        const a = container.querySelector("[data-key=a]")!
        await nextFrame()

        setKey("b")
        flush()
        await sleep(120)

        const opacity = Number(getComputedStyle(a).opacity)
        expect(opacity).toBeGreaterThan(0)
        expect(opacity).toBeLessThan(1)
        expect(container.querySelector("[data-key=b]")).toBeNull()

        await vi.waitFor(() =>
            expect(container.querySelector("[data-key=b]")).not.toBeNull()
        )
    })
})
