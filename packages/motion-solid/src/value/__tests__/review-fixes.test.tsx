import { motionValue, supportsFlags, type MotionValue } from "motion-dom"
import { createMemo, createSignal, createStore, flush, Loading } from "solid-js"
import { render } from "../../jest.setup"
import { useFollowValue } from "../use-follow-value"
import { useMotionTemplate } from "../use-motion-template"
import { useScroll } from "../use-scroll"
import { useSpring } from "../use-spring"
import { useTransform } from "../use-transform"
import { useVelocity } from "../use-velocity"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("useScroll acceleration with dynamic options", () => {
    const ScrollTimeline = (globalThis as any).ScrollTimeline

    beforeEach(() => {
        ;(globalThis as any).ScrollTimeline = class {
            constructor(public options: { source: Element }) {}
        }
    })

    afterEach(() => {
        supportsFlags.scrollTimeline = undefined
        supportsFlags.viewTimeline = undefined
        ;(globalThis as any).ScrollTimeline = ScrollTimeline
    })

    test("the native timeline follows an accessor container", async () => {
        supportsFlags.scrollTimeline = true

        const a = document.createElement("div")
        const b = document.createElement("div")
        const [container, setContainer] = createSignal(a)
        let accelerate: any

        render(() => {
            accelerate = useScroll({ container: () => container() })
                .scrollYProgress.accelerate
            return null
        })

        expect(accelerate).toBeDefined()

        const sources: Element[] = []
        const stop = accelerate.factory({
            attachTimeline: (options: { timeline: any }) => {
                sources.push(options.timeline.options.source)
                return () => {}
            },
        })

        await vi.waitFor(() => expect(sources).toEqual([a]))

        setContainer(b)
        flush()
        await vi.waitFor(() => expect(sources).toEqual([a, b]))

        stop()
        setContainer(a)
        flush()
        await sleep(20)
        expect(sources).toEqual([a, b])
    })

    test("attaches once a non-reactive accessor container is set", async () => {
        supportsFlags.scrollTimeline = true

        const a = document.createElement("div")
        let element: HTMLElement | undefined
        let accelerate: any

        render(() => {
            accelerate = useScroll({ container: () => element }).scrollYProgress
                .accelerate
            return null
        })

        const sources: Element[] = []
        const stop = accelerate.factory({
            attachTimeline: (options: { timeline: any }) => {
                sources.push(options.timeline.options.source)
                return () => {}
            },
        })

        await sleep(32)
        element = a
        await vi.waitFor(() => expect(sources).toEqual([a]))
        stop()
    })

    test("useTransform doesn't accelerate options with getters", () => {
        supportsFlags.scrollTimeline = true

        const [clamp] = createSignal(true)
        let accelerate: any

        render(() => {
            const { scrollYProgress } = useScroll()
            accelerate = useTransform(scrollYProgress, [0, 1], [0, 1], {
                get clamp() {
                    return clamp()
                },
            }).accelerate
            return null
        })

        expect(accelerate).toBeUndefined()
    })

    test("stores in options or ranges aren't accelerated", () => {
        supportsFlags.scrollTimeline = true
        supportsFlags.viewTimeline = true

        const target = document.createElement("div")
        const [options] = createStore({
            container: document.createElement("div"),
        })
        const [range] = createStore([0, 1])
        const [eases] = createStore([(v: number) => v])
        const [offset] = createStore(["start end", "end start"] as any)
        const accelerated: Record<string, unknown> = {}

        render(() => {
            const { scrollYProgress } = useScroll()
            const transform = (name: string, ...args: any[]) =>
                (accelerated[name] = (useTransform as any)(
                    scrollYProgress,
                    ...args
                ).accelerate)

            accelerated.scroll = scrollYProgress.accelerate
            accelerated.storeOptions =
                useScroll(options).scrollYProgress.accelerate
            accelerated.plainOffset = useScroll({
                target,
                offset: ["start end", "end start"],
            }).scrollYProgress.accelerate
            accelerated.storeOffset = useScroll({
                target,
                offset,
            }).scrollYProgress.accelerate
            transform("plain", [0, 1], [0, 100], { ease: [(v: number) => v] })
            transform("storeInput", range, [0, 100])
            transform("storeOutput", [0, 1], range)
            transform("storeEase", [0, 1], [0, 100], { ease: eases })
            return null
        })

        // The accelerated cases they're compared with.
        expect(accelerated.scroll).toBeDefined()
        expect(accelerated.plainOffset).toBeDefined()
        expect(accelerated.plain).toBeDefined()

        expect(accelerated.storeOptions).toBeUndefined()
        expect(accelerated.storeOffset).toBeUndefined()
        expect(accelerated.storeInput).toBeUndefined()
        expect(accelerated.storeOutput).toBeUndefined()
        expect(accelerated.storeEase).toBeUndefined()
    })
})

describe("useSpring/useFollowValue with an accessor source", () => {
    test("settles at the latest value after rapid changes", async () => {
        const [target, setTarget] = createSignal(0)
        let y!: MotionValue<number>

        render(() => {
            y = useSpring(() => target(), { stiffness: 1000, damping: 60 })
            return null
        })

        setTarget(100)
        flush()
        await sleep(32)
        setTarget(0)
        flush()

        await vi.waitFor(() => expect(y.get()).toBe(0), { timeout: 3000 })
        expect(y.isAnimating()).toBe(false)
        await sleep(100)
        expect(y.get()).toBe(0)
    })

    test("follows a new source motion value from its current value", async () => {
        const a = motionValue(0)
        const b = motionValue(50)
        const [source, setSource] = createSignal(a)
        let y!: MotionValue<number>

        render(() => {
            y = useFollowValue(() => source(), {
                type: "tween",
                duration: 0.05,
            })
            return null
        })

        setSource(() => b)
        flush()
        await vi.waitFor(() => expect(y.get()).toBe(50))

        // Only the current source is followed.
        a.set(999)
        b.set(80)
        await vi.waitFor(() => expect(y.get()).toBe(80))
        await sleep(100)
        expect(y.get()).toBe(80)
    })

    test("switching from a motion value to a plain value follows the value", async () => {
        const a = motionValue(10)
        const [useValue, setUseValue] = createSignal(false)
        let y!: MotionValue<number>

        render(() => {
            y = useFollowValue(() => (useValue() ? 30 : a), {
                type: "tween",
                duration: 0.05,
            })
            return null
        })

        setUseValue(true)
        flush()
        await vi.waitFor(() => expect(y.get()).toBe(30))
    })

    test("keeps heading for its target when the options change mid-animation", async () => {
        const [target, setTarget] = createSignal(0)
        const [duration, setDuration] = createSignal(0.2)
        let y!: MotionValue<number>

        render(() => {
            y = useFollowValue(
                () => target(),
                () => ({ type: "tween", duration: duration() })
            )
            return null
        })

        setTarget(100)
        flush()
        await sleep(32)
        setDuration(0.05)
        flush()
        await vi.waitFor(() => expect(y.get()).toBe(100))
    })

    test("stops animating when disposed", async () => {
        const [target, setTarget] = createSignal(0)
        let y!: MotionValue<number>

        const { unmount } = render(() => {
            y = useFollowValue(() => target(), {
                type: "tween",
                duration: 0.5,
            })
            return null
        })

        setTarget(100)
        flush()
        await vi.waitFor(() => expect(y.isAnimating()).toBe(true))
        unmount()
        expect(y.isAnimating()).toBe(false)
        const stopped = y.get()
        await sleep(64)
        expect(y.get()).toBe(stopped)
    })
})

describe("useTransform(() => …)", () => {
    test("tracks Solid signals first read after a motion value change", async () => {
        const x = motionValue(0)
        const [signal, setSignal] = createSignal(5)
        let output!: MotionValue<number>

        render(() => {
            output = useTransform(() => (x.get() > 0 ? signal() : 0))
            return null
        })

        expect(output.get()).toBe(0)
        x.set(1)
        await vi.waitFor(() => expect(output.get()).toBe(5))

        setSignal(7)
        flush()
        expect(output.get()).toBe(7)

        // And stops tracking it once it isn't read.
        x.set(0)
        await vi.waitFor(() => expect(output.get()).toBe(0))
        setSignal(9)
        flush()
        expect(output.get()).toBe(0)
    })

    test("keeps its last value while it reads async data that isn't ready", async () => {
        const x = motionValue(0)
        const data = createMemo(() => sleep(50).then(() => 5))
        let output!: MotionValue<number | undefined>
        const values: Array<number | undefined> = []

        render(() => {
            output = useTransform(() => (x.get() > 0 ? data() : 0))
            output.on("change", (v) => values.push(v))
            return null
        })

        x.set(1)
        await sleep(20)
        expect(output.get()).toBe(0)
        await vi.waitFor(() => expect(output.get()).toBe(5))
        expect(values).not.toContain(undefined)
    })

    test("keeps its published value, not one held by async work", async () => {
        const x = motionValue(0)
        const [signal, setSignal] = createSignal(0)
        const held = createMemo(() => {
            const value = signal()
            return value === 0 ? value : sleep(100).then(() => value)
        })
        const data = createMemo(() => sleep(50).then(() => 5))
        let output!: MotionValue<number>

        const { container } = render(() => {
            output = useTransform(() => (x.get() > 0 ? data() : signal()))
            return <Loading>{held()}</Loading>
        })

        // Held until `held` resolves: the output stays 0.
        setSignal(10)
        flush()
        expect(container.textContent).toBe("0")
        expect(output.get()).toBe(0)

        // Pending: keeps 0, the published value.
        x.set(1)
        await sleep(20)
        expect(output.get()).toBe(0)
        await vi.waitFor(() => expect(output.get()).toBe(5))
    })
})

describe("useMotionTemplate", () => {
    test("keeps a static 0", () => {
        const x = motionValue(2)
        let output!: MotionValue<string>

        render(() => {
            output = useMotionTemplate`${0}px ${x}px`
            return null
        })

        expect(output.get()).toBe("0px 2px")
    })
})

describe("useVelocity", () => {
    test("cancels its scheduled update when disposed", async () => {
        const x = motionValue(0)
        let velocity!: MotionValue<number>

        const { unmount } = render(() => {
            velocity = useVelocity(x)
            return null
        })

        const set = vi.spyOn(velocity, "set")
        x.set(100)
        unmount()
        await sleep(50)
        expect(set).not.toHaveBeenCalled()
    })
})
