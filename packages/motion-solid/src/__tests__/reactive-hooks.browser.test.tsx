import { render } from "@solidjs/testing-library"
import {
    createMemo,
    createSignal,
    flush,
    Loading,
    Show,
    type Accessor,
} from "solid-js"
import {
    animate,
    MotionConfig,
    motionValue,
    useFollowValue,
    useInView,
    useMotionTemplate,
    useMotionValueState,
    useMotionValueEvent,
    useReducedMotionConfig,
    useScroll,
    useSpring,
    useTransform,
    useVelocity,
    type UseInViewOptions,
    type MotionValue,
} from ".."

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Solid-only: hook arguments that can change are accessors, and options are read lazily (see
 * `utils/access.ts`).
 */
describe("Reactive hook arguments", () => {
    test("useTransform follows accessor ranges and options", () => {
        const x = motionValue(150)
        const [max, setMax] = createSignal(100)
        const [clamp, setClamp] = createSignal(true)
        let output!: MotionValue<number>

        render(() => {
            output = useTransform(x, () => [0, max()], [0, 1], {
                get clamp() {
                    return clamp()
                },
            })
            return null
        })

        expect(output.get()).toBe(1)
        setClamp(false)
        flush()
        expect(output.get()).toBe(1.5)
        setMax(300)
        flush()
        expect(output.get()).toBe(0.5)
        x.set(300)
        return vi.waitFor(() => expect(output.get()).toBe(1))
    })

    test("useTransform can be re-pointed with an accessor input", async () => {
        const a = motionValue(1)
        const b = motionValue(10)
        const [input, setInput] = createSignal(a)
        let output!: MotionValue<number>

        render(() => {
            output = useTransform(input, (value: number) => value * 2)
            return null
        })

        expect(output.get()).toBe(2)
        setInput(() => b)
        flush()
        expect(output.get()).toBe(20)

        // Only the current input is followed.
        a.set(5)
        b.set(20)
        await vi.waitFor(() => expect(output.get()).toBe(40))
    })

    test("useMotionTemplate follows accessor values", () => {
        const x = motionValue(1)
        const [unit, setUnit] = createSignal("px")
        let template!: MotionValue<string>

        render(() => {
            template = useMotionTemplate`translateX(${x}${unit})`
            return null
        })

        expect(template.get()).toBe("translateX(1px)")
        setUnit("%")
        flush()
        expect(template.get()).toBe("translateX(1%)")
    })

    test("useSpring follows an accessor source", async () => {
        const [target, setTarget] = createSignal(0)
        let spring!: MotionValue<number>

        render(() => {
            spring = useSpring(target, { duration: 0.05, bounce: 0 })
            return null
        })

        expect(spring.get()).toBe(0)
        setTarget(100)
        flush()
        await vi.waitFor(() => expect(spring.get()).toBeCloseTo(100, 0))
    })

    test("useFollowValue can be re-pointed and re-attaches when its options change", async () => {
        const a = motionValue(0)
        const b = motionValue(50)
        const [source, setSource] = createSignal<MotionValue<number>>(a)
        const [instant, setInstant] = createSignal(false)
        let follow!: MotionValue<number>

        render(() => {
            follow = useFollowValue(source, () =>
                instant()
                    ? { type: "tween", duration: 0 }
                    : { type: "tween", duration: 10 }
            )
            return null
        })

        setSource(() => b)
        setInstant(true)
        flush()
        b.set(80)
        await vi.waitFor(() => expect(follow.get()).toBe(80))

        // `a` isn't followed anymore.
        a.set(10)
        await sleep(50)
        expect(follow.get()).toBe(80)
    })

    test("useInView observes again when its options change", async () => {
        const [margin, setMargin] =
            createSignal<UseInViewOptions["margin"]>("0px")
        let isInView!: Accessor<boolean>

        render(() => {
            let root!: HTMLDivElement
            let element!: HTMLDivElement
            isInView = useInView(() => element, {
                root: () => root,
                get margin() {
                    return margin()
                },
            })
            return (
                <div ref={root} style={{ height: "100px", overflow: "auto" }}>
                    <div
                        ref={element}
                        style={{ "margin-top": "500px", height: "10px" }}
                    />
                </div>
            )
        })

        await sleep(100)
        expect(isInView()).toBe(false)
        setMargin("0px 0px 1000px 0px")
        flush()
        await vi.waitFor(() => expect(isInView()).toBe(true))
    })

    test("useScroll restarts tracking when its options change", async () => {
        const [container, setContainer] = createSignal<HTMLElement>()
        let first!: HTMLDivElement
        let second!: HTMLDivElement
        let scrollY!: MotionValue<number>

        render(() => {
            ;({ scrollY } = useScroll(() => ({ container: container() })))
            const box = (ref: (element: HTMLDivElement) => void) => (
                <div ref={ref} style={{ height: "100px", overflow: "auto" }}>
                    <div style={{ height: "1000px" }} />
                </div>
            )
            return (
                <>
                    {box((element) => (first = element))}
                    {box((element) => (second = element))}
                </>
            )
        })

        setContainer(first)
        flush()
        first.scrollTop = 100
        await vi.waitFor(() => expect(scrollY.get()).toBe(100))

        setContainer(second)
        flush()
        second.scrollTop = 300
        await vi.waitFor(() => expect(scrollY.get()).toBe(300))

        first.scrollTop = 50
        await sleep(100)
        expect(scrollY.get()).toBe(300)
    })

    test("useScroll tracks a container set later through a plain accessor", async () => {
        const [shown, setShown] = createSignal(false)
        let element: HTMLDivElement | undefined
        let scrollY!: MotionValue<number>

        render(() => {
            ;({ scrollY } = useScroll({ container: () => element }))
            return (
                <Show when={shown()}>
                    <div
                        ref={(el) => (element = el)}
                        style={{ height: "100px", overflow: "auto" }}
                    >
                        <div style={{ height: "1000px" }} />
                    </div>
                </Show>
            )
        })

        await sleep(50)
        setShown(true)
        flush()
        await sleep(50)
        element!.scrollTop = 100
        await vi.waitFor(() => expect(scrollY.get()).toBe(100))
    })

    test("useReducedMotionConfig follows MotionConfig", () => {
        const [reducedMotion, setReducedMotion] = createSignal<
            "always" | "never"
        >("never")
        let shouldReduce!: Accessor<boolean | null>

        function Probe() {
            shouldReduce = useReducedMotionConfig()
            return null
        }

        render(() => (
            <MotionConfig reducedMotion={reducedMotion()}>
                <Probe />
            </MotionConfig>
        ))

        expect(shouldReduce()).toBe(false)
        setReducedMotion("always")
        flush()
        expect(shouldReduce()).toBe(true)
    })
})

describe("Motion values in Solid", () => {
    test("useMotionValueState reads a motion value in memos and JSX", async () => {
        const x = motionValue(0)
        let doubled!: Accessor<number>

        const { container } = render(() => {
            const value = useMotionValueState(x)
            doubled = createMemo(() => value() * 2)
            return <span>{value()}</span>
        })

        expect(container.textContent).toBe("0")
        x.set(5)
        flush()
        expect(container.textContent).toBe("5")
        expect(doubled()).toBe(10)

        animate(x, 100, { duration: 0.05 })
        await vi.waitFor(() => expect(container.textContent).toBe("100"))
    })

    test("useMotionValueState allows sets while components are created", () => {
        const x = motionValue(0)

        const { container } = render(() => {
            const value = useMotionValueState(x)
            x.set(3)
            return <span>{value()}</span>
        })
        flush()

        expect(container.textContent).toBe("3")
    })

    test("useMotionValueState switches between motion values and unsubscribes", () => {
        const a = motionValue(1)
        const b = motionValue(2)
        const [source, setSource] = createSignal(a)
        let value!: Accessor<number>

        const { unmount } = render(() => {
            value = useMotionValueState(source)
            return null
        })

        expect(value()).toBe(1)
        setSource(() => b)
        flush()
        expect(value()).toBe(2)
        a.set(10)
        flush()
        expect(value()).toBe(2)
        expect((a as any).events.change?.getSize() ?? 0).toBe(0)

        unmount()
        expect((b as any).events.change?.getSize() ?? 0).toBe(0)
    })

    test("useMotionValueState updates are held with a held transition, like any signal", async () => {
        const x = motionValue(0)
        const [id, setId] = createSignal(1)
        const data = createMemo(() => {
            const value = id()
            if (value === 1) return value
            return sleep(100).then(() => value)
        })

        const { container } = render(() => {
            const value = useMotionValueState(x)
            return (
                <Loading>
                    <span id="held">
                        {data()}:{value()}
                    </span>
                </Loading>
            )
        })
        const text = () => container.querySelector("#held")!.textContent

        expect(text()).toBe("1:0")
        setId(2)
        flush()
        x.set(7)
        flush()
        await vi.waitFor(() => expect(text()).toBe("2:7"))
    })

    test("useMotionValueEvent and useVelocity follow an accessor of a motion value", async () => {
        const a = motionValue(0)
        const b = motionValue(0)
        const [source, setSource] = createSignal(a)
        const changes: number[] = []
        let velocity!: MotionValue<number>

        render(() => {
            useMotionValueEvent(source, "change", (latest) =>
                changes.push(latest)
            )
            velocity = useVelocity(source)
            return null
        })

        a.set(1)
        setSource(() => b)
        flush()
        a.set(2)
        b.set(3)
        expect(changes).toEqual([1, 3])

        animate(b, 1000, { duration: 0.5, ease: "linear" })
        await vi.waitFor(() => expect(velocity.get()).toBeGreaterThan(0))
    })

    test("useTransform(() => …) follows motion values read behind a condition", async () => {
        const a = motionValue(1)
        const b = motionValue(10)
        const [useB, setUseB] = createSignal(false)
        let output!: MotionValue<number>

        render(() => {
            output = useTransform(() => (useB() ? b.get() : a.get()) * 2)
            return null
        })

        expect(output.get()).toBe(2)
        setUseB(true)
        flush()
        expect(output.get()).toBe(20)

        b.set(20)
        await vi.waitFor(() => expect(output.get()).toBe(40))

        // `a` isn't read anymore.
        a.set(5)
        await sleep(50)
        expect(output.get()).toBe(40)
        expect((a as any).events.change?.getSize() ?? 0).toBe(0)
    })
})
