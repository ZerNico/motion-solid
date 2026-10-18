import { render } from "@solidjs/testing-library"
import {
    createContext,
    createSignal,
    createStore,
    flush,
    Show,
    useContext,
} from "solid-js"
import {
    AnimatePresence,
    LayoutGroup,
    motion,
    motionValue,
    Show as PresenceShow,
    visualElementStore,
} from "../.."
import { renderToString } from "../../../test/renderToString"
import { PlainElement } from "./review-fixes.fixtures"

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/**
 * Regressions for issues found in review of the motion component.
 */
describe("motion component (review fixes)", () => {
    test("an exiting element doesn't read its props: derived from what removed it", async () => {
        const [record, setRecord] = createSignal<{
            x: number
            label: string
        } | null>({ x: 10, label: "a" })
        const errors: unknown[] = []
        const onError = (event: ErrorEvent) => errors.push(event.error)
        window.addEventListener("error", onError)

        const { container } = render(() => (
            <AnimatePresence>
                <PresenceShow when={record()}>
                    <motion.div
                        data-label={record()!.label}
                        animate={{ x: record()!.x }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ width: record()!.x, height: 10 }}
                    />
                </PresenceShow>
            </AnimatePresence>
        ))
        const element = container.firstElementChild as HTMLElement
        await nextFrame()

        expect(() => {
            setRecord(null)
            flush()
        }).not.toThrow()
        await nextFrame()
        window.removeEventListener("error", onError)

        expect(errors).toEqual([])
        expect(element.isConnected).toBe(true)
        expect(element.dataset.label).toBe("a")
        expect(element.style.width).toBe("10px")
    })

    test("an exiting element keeps its last rendered and forwarded props", async () => {
        const [show, setShow] = createSignal(true)
        const [label, setLabel] = createSignal("a")
        const [width, setWidth] = createSignal(10)

        const { container } = render(() => (
            <AnimatePresence>
                <PresenceShow when={show()}>
                    <motion.div
                        data-label={label()}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ width: width(), height: 10 }}
                    />
                </PresenceShow>
            </AnimatePresence>
        ))
        const element = container.firstElementChild as HTMLElement
        await nextFrame()

        setShow(false)
        flush()
        setLabel("b")
        setWidth(20)
        flush()

        expect(element.isConnected).toBe(true)
        expect(element.dataset.label).toBe("a")
        expect(element.style.width).toBe("10px")

        // Back: live again.
        setShow(true)
        flush()
        expect(element.dataset.label).toBe("b")
        expect(element.style.width).toBe("20px")
    })

    test("numbers in `style` get px like React, unless unitless", () => {
        const { container } = render(() => (
            <motion.div
                style={{
                    display: "flex",
                    gap: 8,
                    minWidth: 50,
                    letterSpacing: 2,
                    flexGrow: 2,
                    lineHeight: 1.5,
                    zIndex: 3,
                    margin: 0,
                    "--offset": 5,
                    width: 100,
                    x: 10,
                }}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        expect(element.style.gap).toBe("8px")
        expect(element.style.minWidth).toBe("50px")
        expect(element.style.letterSpacing).toBe("2px")
        expect(element.style.flexGrow).toBe("2")
        expect(element.style.lineHeight).toBe("1.5")
        expect(element.style.zIndex).toBe("3")
        expect(element.style.margin).toBe("0px")
        expect(element.style.getPropertyValue("--offset")).toBe("5")
        expect(element.style.width).toBe("100px")
        expect(element.style.transform).toBe("translateX(10px)")
    })

    test("a store-backed `style` is tracked by the motion props (layout animates)", async () => {
        const [store, setStore] = createStore({
            style: { width: 100, height: 50 },
        })
        const { container } = render(() => (
            <motion.div
                layout
                transition={{ duration: 0.5, ease: "linear" }}
                style={store.style}
            />
        ))
        const element = container.firstElementChild as HTMLElement
        await nextFrame()
        await nextFrame()

        setStore((s) => {
            s.style.width = 200
        })
        flush()
        expect(element.style.width).toBe("200px")

        await vi.waitFor(() => {
            expect(element.style.transform).toMatch(/scale/)
            expect(element.getBoundingClientRect().width).toBeLessThan(195)
        })
    })

    test("doesn't render an empty style attribute", () => {
        const [style, setStyle] = createSignal<Record<string, any>>({})
        const { container } = render(() => (
            <>
                <motion.div id="plain" />
                <motion.div id="changing" style={style()} />
            </>
        ))
        const plain = container.querySelector("#plain") as HTMLElement
        const changing = container.querySelector("#changing") as HTMLElement
        expect(plain.hasAttribute("style")).toBe(false)
        expect(changing.hasAttribute("style")).toBe(false)

        setStyle({ width: 10 })
        flush()
        expect(changing.style.width).toBe("10px")

        setStyle({})
        flush()
        expect(changing.style.width).toBe("")
    })

    test("doesn't render an empty style attribute on the server", async () => {
        const { html, hydrate, container } = await renderToString(PlainElement)
        expect(html).not.toContain('style=""')
        hydrate()
        expect(container.querySelector("#box")!.hasAttribute("style")).toBe(
            false
        )
    })

    test("motion.create: children are created where the component renders them", () => {
        const Context = createContext("outer")
        const Wrapper = (props: any) => (
            <Context value="inner">
                <div ref={props.ref}>{props.children}</div>
            </Context>
        )
        const MotionWrapper = motion.create(Wrapper)
        const Child = () => <span id="child">{useContext(Context)}</span>

        const { container } = render(() => (
            <MotionWrapper>
                <Child />
            </MotionWrapper>
        ))
        expect(container.querySelector("#child")!.textContent).toBe("inner")
    })

    test("motion.create: children the component doesn't render aren't created", () => {
        let created = 0
        const Wrapper = (props: any) => <div ref={props.ref} />
        const MotionWrapper = motion.create(Wrapper)
        const Child = () => {
            created++
            return <span />
        }

        render(() => (
            <MotionWrapper>
                <Child />
            </MotionWrapper>
        ))
        expect(created).toBe(0)
    })

    test("motion.create: a component that swaps its root element moves its VisualElement", async () => {
        const [first, setFirst] = createSignal(true)
        const [opacity, setOpacity] = createSignal(1)
        const Wrapper = (props: any) => (
            <Show when={first()} fallback={<section ref={props.ref} />}>
                <div ref={props.ref} />
            </Show>
        )
        const MotionWrapper = motion.create(Wrapper)

        const { container } = render(() => (
            <MotionWrapper
                animate={{ opacity: opacity() }}
                transition={{ duration: 0 }}
            />
        ))
        const div = container.firstElementChild as HTMLElement
        await nextFrame()
        const visualElement = visualElementStore.get(div)
        expect(visualElement).toBeDefined()

        setFirst(false)
        flush()
        await nextFrame()
        const section = container.firstElementChild as HTMLElement
        expect(section.tagName).toBe("SECTION")
        expect(visualElementStore.get(section)).toBe(visualElement)
        expect(visualElement!.current).toBe(section)

        setOpacity(0.5)
        flush()
        await vi.waitFor(() => expect(section.style.opacity).toBe("0.5"))
    })

    test("motion.create: swapping the root element keeps the layout measurement", async () => {
        const [first, setFirst] = createSignal(true)
        const Wrapper = (props: any) => (
            <Show when={first()} fallback={<section ref={props.ref} />}>
                <div ref={props.ref} />
            </Show>
        )
        const MotionWrapper = motion.create(Wrapper)

        const { container } = render(() => (
            <LayoutGroup>
                <MotionWrapper layout />
            </LayoutGroup>
        ))
        await nextFrame()
        const visualElement = visualElementStore.get(
            container.firstElementChild!
        )!

        setFirst(false)
        flush()
        await nextFrame()
        await nextFrame()

        const projection = visualElement.projection as any
        expect((visualElement.current as HTMLElement).tagName).toBe("SECTION")
        expect(projection.instance).toBe(visualElement.current)
        expect(
            projection.eventHandlers.get("animationComplete")?.getSize()
        ).toBe(1)
        expect(projection.eventHandlers.get("willUpdate")?.getSize()).toBe(1)
    })

    test("motion.create: a component that renders its element later mounts on it", async () => {
        const [ready, setReady] = createSignal(false)
        const [opacity, setOpacity] = createSignal(1)
        const Wrapper = (props: any) => (
            <Show when={ready()}>
                <div ref={props.ref} />
            </Show>
        )
        const MotionWrapper = motion.create(Wrapper)

        const { container } = render(() => (
            <MotionWrapper
                animate={{ opacity: opacity() }}
                transition={{ duration: 0 }}
            />
        ))
        await nextFrame()

        setReady(true)
        flush()
        await nextFrame()
        await nextFrame()
        const div = container.firstElementChild as HTMLElement
        expect(visualElementStore.get(div)?.current).toBe(div)

        setOpacity(0.5)
        flush()
        await vi.waitFor(() => expect(div.style.opacity).toBe("0.5"))
    })

    test("motion.create: swapping the root element keeps its values", async () => {
        const [first, setFirst] = createSignal(true)
        const Wrapper = (props: any) => (
            <Show when={first()} fallback={<section ref={props.ref} />}>
                <div ref={props.ref} />
            </Show>
        )
        const MotionWrapper = motion.create(Wrapper)

        const { container } = render(() => (
            <MotionWrapper
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.05 }}
            />
        ))
        const div = container.firstElementChild as HTMLElement
        await vi.waitFor(() => expect(div.style.opacity).toBe("1"))

        setFirst(false)
        flush()
        await nextFrame()
        await nextFrame()
        const section = container.firstElementChild as HTMLElement
        expect(section.tagName).toBe("SECTION")
        expect(section.style.opacity).toBe("1")
    })

    test("motion.create: swapping the root element while it exits keeps exiting", async () => {
        const [shown, setShown] = createSignal(true)
        const [first, setFirst] = createSignal(true)
        const onExitComplete = vi.fn()
        const Wrapper = (props: any) => (
            <Show when={first()} fallback={<section ref={props.ref} />}>
                <div ref={props.ref} />
            </Show>
        )
        const MotionWrapper = motion.create(Wrapper)

        const { container } = render(() => (
            <AnimatePresence onExitComplete={onExitComplete}>
                <PresenceShow when={shown()}>
                    <MotionWrapper
                        layout
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    />
                </PresenceShow>
            </AnimatePresence>
        ))
        await nextFrame()

        setShown(false)
        flush()
        await nextFrame()
        setFirst(false)
        flush()
        await nextFrame()
        await nextFrame()

        const section = container.querySelector("section")
        expect(section?.isConnected).toBe(true)
        expect(onExitComplete).not.toHaveBeenCalled()

        await vi.waitFor(() => expect(onExitComplete).toHaveBeenCalledTimes(1))
        expect(section!.isConnected).toBe(false)
    })

    test("motion.create: a late element with a layoutId doesn't leave its tree updating", async () => {
        const [ready, setReady] = createSignal(false)
        const Wrapper = (props: any) => (
            <Show when={ready()}>
                <div ref={props.ref} />
            </Show>
        )
        const MotionWrapper = motion.create(Wrapper)

        const { container } = render(() => <MotionWrapper layoutId="late" />)
        await nextFrame()

        setReady(true)
        flush()
        await nextFrame()
        await nextFrame()

        const projection = visualElementStore.get(container.firstElementChild!)!
            .projection!
        expect(projection.instance).toBe(container.firstElementChild)
        expect(projection.root!.isUpdating).toBe(false)
    })

    describe("motion.create: swapping the root element (round 4)", () => {
        const sleep = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms))
        const swapper = () => {
            const [first, setFirst] = createSignal(true)
            const Wrapper = (props: any) => (
                <Show
                    when={first()}
                    fallback={<section ref={props.ref} style={props.style} />}
                >
                    <div ref={props.ref} style={props.style} />
                </Show>
            )
            return { MotionWrapper: motion.create(Wrapper), setFirst }
        }

        test("a running animation continues on the new element", async () => {
            const { MotionWrapper, setFirst } = swapper()
            const { container } = render(() => (
                <MotionWrapper
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, ease: "linear" }}
                />
            ))
            await sleep(200)
            setFirst(false)
            flush()
            await sleep(300)
            const section = container.querySelector("section")!
            const opacity = Number(getComputedStyle(section).opacity)
            expect(opacity).toBeGreaterThan(0.2)
            expect(opacity).toBeLessThan(1)
            await vi.waitFor(() =>
                expect(getComputedStyle(section).opacity).toBe("1")
            )
        })

        test("an accelerated value is bound to the new element", async () => {
            const { MotionWrapper, setFirst } = swapper()
            const targets: Element[] = []
            const opacity = motionValue(0.5)
            opacity.accelerate = {
                factory: (animation: any) => {
                    targets.push(animation.animation?.effect?.target)
                    return () => {}
                },
                times: [0, 1],
                keyframes: [0, 1],
                ease: (v: number) => v,
                duration: 1,
            } as any

            const { container } = render(() => (
                <MotionWrapper style={{ opacity }} />
            ))
            await nextFrame()
            expect(targets.at(-1)?.tagName).toBe("DIV")

            setFirst(false)
            flush()
            await nextFrame()
            await nextFrame()
            expect(targets.at(-1)).toBe(container.querySelector("section"))
        })

        test("the old element isn't mapped to the VisualElement anymore", async () => {
            const { MotionWrapper, setFirst } = swapper()
            const { container } = render(() => <MotionWrapper />)
            await nextFrame()
            const div = container.firstElementChild!

            setFirst(false)
            flush()
            await nextFrame()
            expect(visualElementStore.get(div)).toBeUndefined()
            expect(
                visualElementStore.get(container.firstElementChild!)
            ).toBeDefined()
        })

        test("whileInView follows the new element", async () => {
            const [first, setFirst] = createSignal(true)
            const Wrapper = (props: any) => (
                <Show
                    when={first()}
                    fallback={
                        <section
                            ref={props.ref}
                            style={{ "margin-top": "3000px", height: "10px" }}
                        />
                    }
                >
                    <div ref={props.ref} style={{ height: "10px" }} />
                </Show>
            )
            const MotionWrapper = motion.create(Wrapper)
            const { container } = render(() => (
                <MotionWrapper whileInView={{ opacity: 0.5 }} />
            ))
            const visualElement = visualElementStore.get(
                container.firstElementChild!
            )!
            const isInView = () =>
                visualElement.animationState!.getState().whileInView.isActive
            await vi.waitFor(() => expect(isInView()).toBe(true))

            setFirst(false)
            flush()
            await sleep(200)
            expect(isInView()).toBe(false)
        })

        test("an SVG component moved to a nested SVG element renders as one", async () => {
            const [first, setFirst] = createSignal(true)
            const Wrapper = (props: any) => (
                <svg>
                    <Show when={first()} fallback={<g ref={props.ref} />}>
                        <svg ref={props.ref} />
                    </Show>
                </svg>
            )
            const MotionWrapper = motion.create(Wrapper, { type: "svg" })
            const { container } = render(() => <MotionWrapper rotate={45} />)
            await nextFrame()
            const visualElement = visualElementStore.get(
                container.querySelector("svg svg")!
            )! as any
            expect(visualElement.isSVGTag).toBe(true)

            setFirst(false)
            flush()
            await nextFrame()
            await nextFrame()
            expect(visualElement.current.tagName).toBe("g")
            expect(visualElement.isSVGTag).toBe(false)
        })

        test("with `layout` turned off in the same update, a later exit completes", async () => {
            const [shown, setShown] = createSignal(true)
            const [first, setFirst] = createSignal(true)
            const [layout, setLayout] = createSignal(true)
            const onExitComplete = vi.fn()
            const Wrapper = (props: any) => (
                <Show when={first()} fallback={<section ref={props.ref} />}>
                    <div ref={props.ref} />
                </Show>
            )
            const MotionWrapper = motion.create(Wrapper)

            const { container } = render(() => (
                <AnimatePresence onExitComplete={onExitComplete}>
                    <PresenceShow when={shown()}>
                        <MotionWrapper
                            layout={layout()}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                        />
                    </PresenceShow>
                </AnimatePresence>
            ))
            await nextFrame()

            setFirst(false)
            setLayout(false)
            flush()
            await nextFrame()
            await nextFrame()

            setShown(false)
            flush()
            await vi.waitFor(() =>
                expect(onExitComplete).toHaveBeenCalledTimes(1)
            )
            expect(container.querySelector("section")).toBeNull()
        })

        test("while its shared layout exits, the exit lasts until the layout animation is done", async () => {
            const [shown, setShown] = createSignal(true)
            const [first, setFirst] = createSignal(true)
            const onExitComplete = vi.fn()
            const Wrapper = (props: any) => (
                <Show
                    when={first()}
                    fallback={<section ref={props.ref} style={props.style} />}
                >
                    <div ref={props.ref} style={props.style} />
                </Show>
            )
            const MotionWrapper = motion.create(Wrapper)
            const boxStyle = (top: number) => ({
                position: "absolute" as const,
                top: `${top}px`,
                left: "0px",
                width: "100px",
                height: "100px",
            })

            render(() => (
                <>
                    <motion.div
                        layoutId="shared"
                        style={boxStyle(0)}
                        transition={{ duration: 0.6, ease: "linear" }}
                    />
                    <AnimatePresence onExitComplete={onExitComplete}>
                        <PresenceShow when={shown()}>
                            <MotionWrapper
                                layoutId="shared"
                                style={boxStyle(200)}
                                transition={{ duration: 0.6, ease: "linear" }}
                            />
                        </PresenceShow>
                    </AnimatePresence>
                </>
            ))
            await sleep(800)

            setShown(false)
            flush()
            await sleep(100)
            setFirst(false)
            flush()
            await sleep(100)
            expect(onExitComplete).not.toHaveBeenCalled()
            await vi.waitFor(
                () => expect(onExitComplete).toHaveBeenCalledTimes(1),
                { timeout: 3000 }
            )
        })
    })
})
