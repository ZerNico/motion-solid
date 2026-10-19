import { render } from "@solidjs/testing-library"
import {
    createEffect,
    createMemo,
    createSignal,
    flush,
    isPending,
    Loading,
    OBSERVE,
    Show as SolidShow,
    type DiagnosticCode,
    type DiagnosticEvent,
} from "solid-js"
import { attribution } from "solid-js/attribution"
import {
    AnimatePresence,
    animate,
    domAnimation,
    domMax,
    For,
    LayoutGroup,
    LazyMotion,
    m,
    motion,
    MotionConfig,
    Reorder,
    Show,
    useAnimate,
    useInView,
    useMotionTemplate,
    useMotionValue,
    useMotionValueState,
    usePresence,
    useScroll,
    useSpring,
    useTransform,
    useVelocity,
} from ".."
import { trigger } from "../../test/e2e/utils"

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Port note: Solid-only. With `solid-js/attribution` enabled (plain dev builds don't check
 * effect relays), Solid reports effects that relay state (`EFFECT_RELAY_TEAR`,
 * `EFFECT_WRITES_OWN_SOURCE`) and other structural findings. These tests drive the components
 * through real scenarios and guard the number of findings per code: a change that adds some
 * fails, one that removes some only needs the baseline lowered. See PORTING.md, "Solid dev
 * diagnostics".
 */
type Counts = Partial<Record<DiagnosticCode, number>>

const BASELINE: Record<string, Counts> = {
    // The test resolves the data right away, so the fallback only flashes.
    "async prop and held update": { FALLBACK_FLASH: 1 },
}

let events: DiagnosticEvent[] = []
let stop: VoidFunction | undefined

beforeEach(() => {
    events = []
    // The time-based checks depend on the machine's load, so they're off.
    const release = attribution.enable({
        log: false,
        hotRuns: false,
        hotTime: false,
        wastedRecompute: false,
    })
    const unsubscribe = OBSERVE!.diagnostics.subscribe((event) => {
        events.push(event)
    })
    stop = () => {
        unsubscribe()
        release()
    }
})

afterEach((context) => {
    stop?.()
    stop = undefined
    if (context.task.name.startsWith("control:")) return

    const counts: Counts = {}
    for (const event of events) {
        counts[event.code] = (counts[event.code] ?? 0) + 1
    }
    const baseline = BASELINE[context.task.name] ?? {}
    const over = Object.entries(counts).filter(
        ([code, count]) => count > (baseline[code as DiagnosticCode] ?? 0)
    )
    if (over.length > 0) {
        // The findings, to locate the new ones.
        console.log(
            events.map((event) => ({
                code: event.code,
                severity: event.severity,
                node: event.nodeName,
                owner: event.ownerPath?.join(" › "),
                data: event.data,
            }))
        )
    }
    expect(counts).toEqual(
        expect.objectContaining(
            Object.fromEntries(
                over.map(([code]) => [
                    code,
                    baseline[code as DiagnosticCode] ?? 0,
                ])
            )
        )
    )

    /**
     * The library's nodes are named (`Motion.*`), so findings in apps say which part of motion
     * they're about. The dev compiler names the tests' own nodes after their variables, and
     * would name the library's the same way (`createPresenceList.completed`): only the built
     * package has anonymous nodes (`effect`, `memo`) without explicit names.
     */
    const unnamed = events.flatMap((event) => {
        const data = event.data as Record<string, unknown> | undefined
        return [
            event.nodeName,
            data?.victim,
            data?.root,
            data?.relay,
            data?.wrote,
        ].filter(
            (name): name is string =>
                typeof name === "string" &&
                (ANONYMOUS.has(name) ||
                    (name.includes(".") && !name.startsWith("Motion.")))
        )
    })
    expect(unnamed).toEqual([])
})

const ANONYMOUS = new Set(["effect", "memo", "computed", "signal"])

const settle = async (ms = 300) => {
    await nextFrame()
    await sleep(ms)
}

test("mount and animate", async () => {
    render(() => (
        <motion.div
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 100 }}
            transition={{ duration: 0.1 }}
        />
    ))
    await settle()
})

test("animate prop change", async () => {
    const [x, setX] = createSignal(0)
    render(() => (
        <motion.div animate={{ x: x() }} transition={{ duration: 0.05 }} />
    ))
    await settle(100)
    for (const value of [100, 200, 300]) {
        setX(value)
        flush()
        await settle(100)
    }
})

test("variants propagate", async () => {
    const [open, setOpen] = createSignal(false)
    render(() => (
        <motion.ul
            initial="closed"
            animate={open() ? "open" : "closed"}
            variants={{
                open: { opacity: 1, transition: { staggerChildren: 0.01 } },
                closed: { opacity: 0.5 },
            }}
            transition={{ duration: 0.05 }}
        >
            {[1, 2, 3].map(() => (
                <motion.li
                    variants={{ open: { x: 0 }, closed: { x: -20 } }}
                    transition={{ duration: 0.05 }}
                />
            ))}
        </motion.ul>
    ))
    await settle(100)
    for (const value of [true, false, true]) {
        setOpen(value)
        flush()
        await settle(150)
    }
})

test("AnimatePresence enter/exit (presence-aware Show)", async () => {
    const [shown, setShown] = createSignal(false)
    render(() => (
        <AnimatePresence>
            <Show when={shown()}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.05 }}
                />
            </Show>
        </AnimatePresence>
    ))
    for (const value of [true, false, true, false]) {
        setShown(value)
        flush()
        await settle(150)
    }
})

test("AnimatePresence enter/exit (Solid's Show)", async () => {
    const [shown, setShown] = createSignal(false)
    render(() => (
        <AnimatePresence>
            <SolidShow when={shown()}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.05 }}
                />
            </SolidShow>
        </AnimatePresence>
    ))
    for (const value of [true, false, true, false]) {
        setShown(value)
        flush()
        await settle(150)
    }
})

test("AnimatePresence exit without animations", async () => {
    const [items, setItems] = createSignal([1, 2, 3])
    render(() => (
        <AnimatePresence>
            <For each={items()}>
                {(item) => <motion.div>{item}</motion.div>}
            </For>
        </AnimatePresence>
    ))
    for (const value of [[1, 3], [3], [1, 2, 3]]) {
        setItems(value)
        flush()
        await settle(50)
    }
    expect(document.body.textContent?.replace(/\s/g, "")).toBe("123")
})

test("AnimatePresence list (presence-aware For)", async () => {
    const [items, setItems] = createSignal([1, 2, 3])
    render(() => (
        <ul>
            <AnimatePresence>
                <For each={items()}>
                    {(item) => (
                        <motion.li
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.05 }}
                        >
                            {item}
                        </motion.li>
                    )}
                </For>
            </AnimatePresence>
        </ul>
    ))
    await settle(100)
    for (const value of [
        [3, 1, 2],
        [3, 2],
        [4, 3, 2, 1],
    ]) {
        setItems(value)
        flush()
        await settle(150)
    }
})

test("layout animation", async () => {
    const [wide, setWide] = createSignal(false)
    render(() => (
        <motion.div
            layout
            style={{ width: wide() ? "300px" : "100px", height: "50px" }}
            transition={{ duration: 0.05 }}
        />
    ))
    await settle(100)
    for (const value of [true, false, true]) {
        setWide(value)
        flush()
        await settle(150)
    }
})

test("LayoutGroup with shared layoutId", async () => {
    const [selected, setSelected] = createSignal(0)
    render(() => (
        <LayoutGroup>
            {[0, 1, 2].map((index) => (
                <div style={{ width: "100px", height: "40px" }}>
                    <SolidShow when={selected() === index}>
                        <motion.div
                            layoutId="underline"
                            style={{ height: "4px" }}
                            transition={{ duration: 0.05 }}
                        />
                    </SolidShow>
                </div>
            ))}
        </LayoutGroup>
    ))
    await settle(100)
    for (const value of [1, 2, 0]) {
        setSelected(value)
        flush()
        await settle(150)
    }
})

test("motion values (no Solid writes)", async () => {
    let x!: ReturnType<typeof useMotionValue<number>>
    render(() => {
        x = useMotionValue(0)
        const opacity = useTransform(x, [0, 100], [0, 1])
        return <motion.div style={{ x, opacity }} />
    })
    await settle(50)
    animate(x, 100, { duration: 0.1 })
    await settle(200)
    x.set(20)
    await settle(50)
})

test("async prop and held update", async () => {
    const [id, setId] = createSignal(1)
    const resolvers = new Map<number, (value: number) => void>()
    const target = createMemo(
        () => new Promise<number>((resolve) => resolvers.set(id(), resolve))
    )
    render(() => (
        <Loading fallback={<p />}>
            <motion.div
                animate={{ x: target() }}
                transition={{ duration: 0.05 }}
            />
            <AnimatePresence>
                <Show when={isPending(() => target())}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.05 }}
                    />
                </Show>
            </AnimatePresence>
        </Loading>
    ))
    resolvers.get(1)!(100)
    await settle(150)
    setId(2)
    flush()
    await settle(100)
    resolvers.get(2)!(200)
    await settle(200)
})

test("control: a deliberate relay is reported", async () => {
    const [source, setSource] = createSignal(0)
    render(() => {
        const [copy, setCopy] = createSignal(0)
        createEffect(source, (value) => {
            setCopy(value)
        })
        return (
            <p>
                {copy()}
                {source()}
            </p>
        )
    })
    for (const value of [1, 2, 3, 4]) {
        setSource(value)
        flush()
        await nextFrame()
    }
    expect(events.map((event) => event.code)).toContain("EFFECT_RELAY_TEAR")
})

test("AnimatePresence mode=wait keyed swap", async () => {
    const [key, setKey] = createSignal("a")
    render(() => (
        <AnimatePresence mode="wait">
            <Show when={key()} keyed>
                {(value) => (
                    <motion.div
                        id={value}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.05 }}
                    />
                )}
            </Show>
        </AnimatePresence>
    ))
    for (const value of ["b", "c", "a"]) {
        setKey(value)
        flush()
        await settle(250)
    }
})

test("AnimatePresence mode=popLayout list", async () => {
    const [items, setItems] = createSignal([1, 2, 3])
    render(() => (
        <ul style={{ position: "relative" }}>
            <AnimatePresence mode="popLayout">
                <For each={items()}>
                    {(item) => (
                        <motion.li
                            layout
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.05 }}
                            style={{ height: "20px" }}
                        >
                            {item}
                        </motion.li>
                    )}
                </For>
            </AnimatePresence>
        </ul>
    ))
    for (const value of [[1, 3], [3], [1, 2, 3]]) {
        setItems(value)
        flush()
        await settle(150)
    }
})

test("usePresence with safeToRemove", async () => {
    const [shown, setShown] = createSignal(true)
    function Child() {
        const [isPresent, safeToRemove] = usePresence()
        createEffect(isPresent, (present) => {
            if (!present) setTimeout(() => safeToRemove?.(), 20)
        })
        return <div />
    }
    render(() => (
        <AnimatePresence>
            <Show when={shown()}>
                <Child />
            </Show>
        </AnimatePresence>
    ))
    for (const value of [false, true, false]) {
        setShown(value)
        flush()
        await settle(100)
    }
})

test("gestures: hover and tap", async () => {
    render(() => (
        <motion.button
            id="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.05 }}
        >
            button
        </motion.button>
    ))
    const button = document.getElementById("button")!
    for (let i = 0; i < 3; i++) {
        trigger(button, "pointerenter")
        trigger(button, "pointerover")
        await settle(80)
        trigger(button, "pointerdown")
        await settle(80)
        expect(button.style.transform).toContain("scale(0.9)")
        trigger(button, "pointerup")
        trigger(window, "pointerup")
        await settle(80)
        trigger(button, "pointerleave")
        trigger(button, "pointerout")
        await settle(80)
    }
})

test("drag", async () => {
    render(() => (
        <motion.div
            id="box"
            drag
            dragMomentum={false}
            style={{ width: "50px", height: "50px", background: "red" }}
        />
    ))
    const box = document.getElementById("box")!
    for (let i = 0; i < 2; i++) {
        trigger(box, "pointerdown", { x: 10, y: 10 })
        await nextFrame()
        trigger(document, "pointermove", { clientX: 30, clientY: 30 })
        await nextFrame()
        trigger(document, "pointermove", { clientX: 80, clientY: 60 })
        await nextFrame()
        trigger(document, "pointerup", { clientX: 80, clientY: 60 })
        await settle(100)
    }
    expect(box.style.transform).toContain("translate")
})

test("Reorder", async () => {
    const [items, setItems] = createSignal(["a", "b", "c"])
    render(() => (
        <Reorder.Group axis="y" values={items()} onReorder={setItems}>
            <For each={items()}>
                {(item) => (
                    <Reorder.Item
                        value={item}
                        id={item}
                        style={{ height: "30px" }}
                    >
                        {item}
                    </Reorder.Item>
                )}
            </For>
        </Reorder.Group>
    ))
    await settle(50)
    const a = document.getElementById("a")!
    trigger(a, "pointerdown", { x: 5, y: 5 })
    await nextFrame()
    for (const y of [20, 45, 70]) {
        trigger(document, "pointermove", { clientX: 10, clientY: y })
        await settle(50)
    }
    trigger(document, "pointerup", { clientX: 10, clientY: 70 })
    await settle(200)
    expect(items()).not.toEqual(["a", "b", "c"])
    setItems(["c", "b", "a"])
    flush()
    await settle(150)
})

test("LazyMotion with async features", async () => {
    let load!: VoidFunction
    const features = () =>
        new Promise<typeof domMax>((resolve) => (load = () => resolve(domMax)))
    const [x, setX] = createSignal(0)
    render(() => (
        <LazyMotion features={features}>
            <m.div
                layout
                animate={{ x: x() }}
                transition={{ duration: 0.05 }}
            />
        </LazyMotion>
    ))
    await settle(50)
    load()
    await settle(100)
    setX(50)
    flush()
    await settle(100)
})

test("LazyMotion with sync features", async () => {
    const [x, setX] = createSignal(0)
    render(() => (
        <LazyMotion features={domAnimation}>
            <m.div animate={{ x: x() }} transition={{ duration: 0.05 }} />
        </LazyMotion>
    ))
    for (const value of [50, 100]) {
        setX(value)
        flush()
        await settle(100)
    }
})

test("MotionConfig change", async () => {
    const [duration, setDuration] = createSignal(0.05)
    const [x, setX] = createSignal(0)
    render(() => (
        <MotionConfig transition={{ duration: duration() }}>
            <motion.div animate={{ x: x() }} />
        </MotionConfig>
    ))
    for (const value of [0.02, 0.08]) {
        setDuration(value)
        setX((previous) => previous + 50)
        flush()
        await settle(150)
    }
})

test("whileInView and useInView", async () => {
    const [shown, setShown] = createSignal(false)
    let inView!: () => boolean
    render(() => {
        let ref!: HTMLDivElement
        inView = useInView(() => ref)
        return (
            <div style={{ height: "300px", overflow: "auto" }} id="scroller">
                <div style={{ height: shown() ? "10px" : "1000px" }} />
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.05 }}
                    style={{ height: "20px" }}
                />
            </div>
        )
    })
    await settle(100)
    setShown(true)
    flush()
    await settle(200)
    expect(inView()).toBe(true)
    setShown(false)
    flush()
    await settle(200)
    void inView
})

test("useScroll, useSpring, useTransform", async () => {
    render(() => {
        let container!: HTMLDivElement
        const { scrollYProgress } = useScroll({ container: () => container })
        const spring = useSpring(scrollYProgress)
        const width = useTransform(spring, [0, 1], ["0%", "100%"])
        return (
            <div
                id="scroller"
                ref={container}
                style={{ height: "100px", overflow: "auto" }}
            >
                <motion.div style={{ width, height: "4px" }} />
                <div style={{ height: "1000px" }} />
            </div>
        )
    })
    const scroller = document.getElementById("scroller")!
    for (const top of [200, 600, 0]) {
        scroller.scrollTop = top
        await settle(100)
    }
})

test("useAnimate", async () => {
    let scopeAnimate!: ReturnType<typeof useAnimate>[1]
    render(() => {
        const [scope, animateScope] = useAnimate()
        scopeAnimate = animateScope
        return (
            <div ref={scope}>
                <span class="item" />
            </div>
        )
    })
    await settle(20)
    await scopeAnimate(".item", { opacity: 0.5 }, { duration: 0.05 })
    await settle(20)
})

test("motion values bridged into Solid", async () => {
    const [offset, setOffset] = createSignal(0)
    let x!: ReturnType<typeof useMotionValue<number>>
    let read!: () => number
    render(() => {
        x = useMotionValue(0)
        const shifted = useTransform(() => x.get() + offset())
        const velocity = useVelocity(x)
        const transform = useMotionTemplate`translateX(${shifted}px)`
        read = useMotionValueState(shifted)
        return (
            <div>
                <motion.div style={{ transform }}>{x}</motion.div>
                <span>{read()}</span>
                <motion.span>{velocity}</motion.span>
            </div>
        )
    })
    await settle(20)
    animate(x, 100, { duration: 0.1 })
    await settle(200)
    for (const value of [10, 20]) {
        setOffset(value)
        flush()
        await settle(50)
    }
    expect(read()).toBe(120)
})
