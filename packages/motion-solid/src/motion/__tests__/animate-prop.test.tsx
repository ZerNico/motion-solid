/**
 * Port note: upstream calls `rerender(<Component />)` with identical props right after
 * `render` (to flush StrictMode/React effects). A Solid component runs once, so those
 * identical rerenders are no-ops and are dropped. Rerenders with changed props set signals
 * and `flush()`.
 */
import type { JSX } from "@solidjs/web"
import { createMemo, createSignal, flush, For, Loading, Show } from "solid-js"
import {
    frame,
    motion,
    MotionGlobalConfig,
    motionValue,
    stagger,
    useMotionValue,
    useMotionValueEvent,
} from "../../"
import { nextFrame } from "../../gestures/__tests__/utils"
import { render } from "../../jest.setup"

/**
 * The first change subscriber is stored on the value directly and only a
 * second creates a SubscriptionManager, so count both. Private API.
 */
const countChangeSubscribers = (value: any) =>
    (value.changeSubscriber ? 1 : 0) + (value.events.change?.getSize() ?? 0)

describe("animate prop as object", () => {
    test("animates to set prop", async () => {
        const promise = new Promise((resolve) => {
            const x = motionValue(0)
            const onComplete = () => resolve(x.get())
            const Component = () => (
                <motion.div
                    animate={{ x: 20 }}
                    style={{ x }}
                    onAnimationComplete={onComplete}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBe(20)
    })
    test("accepts custom transition prop", async () => {
        const promise = new Promise((resolve) => {
            const x = motionValue(0)
            const Component = () => (
                <motion.div
                    animate={{ x: 20 }}
                    transition={{
                        x: { type: "tween", from: 10, ease: () => 0.5 },
                    }}
                    onUpdate={() => resolve(x.get())}
                    style={{ x }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBe(15)
    })
    test("fires onAnimationStart when animation begins", async () => {
        const promise = new Promise((resolve) => {
            const onStart = jest.fn()
            const onComplete = () => resolve(onStart)
            const Component = () => (
                <motion.div
                    animate={{ x: 20 }}
                    transition={{ type: false }}
                    onAnimationStart={onStart}
                    onAnimationComplete={onComplete}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBeCalledTimes(1)
    })
    test("uses transition on subsequent renders", async () => {
        const promise = new Promise((resolve) => {
            const x = motionValue(0)
            const Component = (props: any) => (
                <motion.div animate={props.animate} style={{ x }} />
            )
            const [animate, setAnimate] = createSignal<any>({
                x: 10,
                transition: { type: false },
            })
            render(() => <Component animate={animate()} />)
            setAnimate({ x: 20, transition: { type: false } })
            flush()
            setAnimate({ x: 30, transition: { type: false } })
            flush()
            requestAnimationFrame(() => resolve(x.get()))
        })
        return expect(promise).resolves.toBe(30)
    })
    test("transition accepts manual from value", async () => {
        const promise = new Promise((resolve) => {
            const output: number[] = []
            const Component = () => (
                <motion.div
                    initial={{ x: 100 }}
                    animate={{ x: 50 }}
                    transition={{ from: 0, ease: "linear" }}
                    onUpdate={(v: { x: number }) => output.push(v.x)}
                    onAnimationComplete={() => {
                        resolve(output.every((v) => v <= 50))
                    }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBe(true)
    })
    test("uses transitionEnd on subsequent renders", async () => {
        const promise = new Promise(async (resolve) => {
            const x = motionValue(0)
            const Component = (props: any) => (
                <motion.div animate={props.animate} style={{ x }} />
            )
            const [animate, setAnimate] = createSignal<any>({
                x: 10,
                transition: { type: false },
                transitionEnd: { x: 100 },
            })
            render(() => <Component animate={animate()} />)
            setAnimate({
                x: 20,
                transition: { type: false },
                transitionEnd: { x: 200 },
            })
            flush()
            setAnimate({
                x: 30,
                transition: { type: false },
                transitionEnd: { x: 300 },
            })
            flush()

            await nextFrame()
            await nextFrame()

            resolve(x.get())
        })
        return expect(promise).resolves.toBe(300)
    })
    test("animates to set prop and preserves existing initial transform props", async () => {
        const promise = new Promise((resolve) => {
            const onComplete = () => {
                // Animation complete currently fires when animation is complete, before the actual render
                setTimeout(() => resolve(container.firstChild as any), 20)
            }
            const [initial, setInitial] = createSignal<any>({ scale: 0 })
            const { container } = render(() => (
                <motion.div
                    initial={initial()}
                    animate={{ x: 20 }}
                    onAnimationComplete={onComplete}
                />
            ))
            setInitial(undefined)
            flush()
        })
        return expect(promise).resolves.toHaveStyle(
            "transform: translateX(20px) scale(0)"
        )
    })
    test("style doesnt overwrite in subsequent renders", async () => {
        const promise = new Promise((resolve) => {
            const history: number[] = []
            const onAnimationComplete = () => {
                setTimeout(() => {
                    let styleHasOverridden = false
                    let prev = 0
                    for (let i = 0; i < history.length; i++) {
                        if (history[i] < prev) {
                            styleHasOverridden = true
                            break
                        }
                        prev = history[i]
                    }
                    resolve(styleHasOverridden)
                }, 20)
            }
            const Component = (props: any) => (
                <motion.div
                    animate={{ rotate: `${props.rotate}deg` }}
                    transition={{ duration: 0.05 }}
                    style={{ rotate: "0deg" }}
                    onUpdate={({ rotate }) =>
                        history.push(parseFloat(rotate as string))
                    }
                    onAnimationComplete={props.onComplete}
                />
            )
            const [rotate, setRotate] = createSignal(1000)
            const [onComplete, setOnComplete] = createSignal<
                (() => void) | undefined
            >(undefined)
            render(() => (
                <Component rotate={rotate()} onComplete={onComplete()} />
            ))
            setTimeout(() => {
                setRotate(1001)
                setOnComplete(() => onAnimationComplete)
                flush()
            }, 120)
        })
        return expect(promise).resolves.toBe(false)
    })
    test("applies custom transform", async () => {
        const promise = new Promise((resolve) => {
            const resolveContainer = () => {
                requestAnimationFrame(() => {
                    resolve(container.firstChild as any)
                })
            }
            const Component = () => (
                <motion.div
                    initial={{ x: 10 }}
                    animate={{ x: 30 }}
                    transition={{ duration: 0.01 }}
                    transformTemplate={({ x }, generated) =>
                        `translateY(${x}) ${generated}`
                    }
                    onAnimationComplete={resolveContainer}
                />
            )
            const { container } = render(() => <Component />)
        })
        return expect(promise).resolves.toHaveStyle(
            "transform: translateY(30px) translateX(30px)"
        )
    })
    test("animating between none/block fires onAnimationComplete", async () => {
        const promise = new Promise((resolve) => {
            const Component = () => (
                <motion.div
                    initial={{ display: "none" }}
                    animate={{ display: "block" }}
                    transition={{ duration: 0.01 }}
                    onAnimationComplete={() => {
                        resolve(true)
                    }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toEqual(true)
    })

    test("animate display none => block immediately switches to block", async () => {
        const promise = new Promise((resolve) => {
            const Component = () => {
                const display = useMotionValue("block")
                let hasChecked = false

                return (
                    <motion.div
                        initial={{ display: "none", opacity: 0 }}
                        animate={{ display: "block", opacity: 1 }}
                        style={{ display }}
                        transition={{ duration: 0.1 }}
                        onUpdate={(latest) => {
                            if (!hasChecked) {
                                expect(latest.display).toBe("block")
                                hasChecked = true
                            }
                        }}
                        onAnimationComplete={() => {
                            resolve([hasChecked, display.get()])
                        }}
                    />
                )
            }
            render(() => <Component />)
        })
        return expect(promise).resolves.toEqual([true, "block"])
    })

    test("animate display block => none switches to none on animation end", async () => {
        const promise = new Promise((resolve) => {
            let hasChecked = false
            const Component = () => {
                const display = useMotionValue("block")

                return (
                    <motion.div
                        initial={{ display: "block", opacity: 1 }}
                        animate={{ display: "none", opacity: 0 }}
                        style={{ display }}
                        transition={{ duration: 0.1 }}
                        onUpdate={(latest) => {
                            if (!hasChecked) {
                                expect(latest.display).toBe("block")
                                hasChecked = true
                            }
                        }}
                        onAnimationComplete={() => {
                            resolve([hasChecked, display.get()])
                        }}
                    />
                )
            }
            render(() => <Component />)
        })
        return expect(promise).resolves.toEqual([true, "none"])
    })

    test("animate visibility hidden => visible immediately switches to visible", async () => {
        const promise = new Promise((resolve) => {
            const Component = () => {
                const visibility = useMotionValue("visible")
                let hasChecked = false

                return (
                    <motion.div
                        initial={{ visibility: "hidden", opacity: 0 }}
                        animate={{ visibility: "visible", opacity: 1 }}
                        style={{ visibility }}
                        transition={{ duration: 0.1 }}
                        onUpdate={(latest) => {
                            if (!hasChecked) {
                                expect(latest.visibility).toBe("visible")
                                hasChecked = true
                            }
                        }}
                        onAnimationComplete={() => {
                            resolve([hasChecked, visibility.get()])
                        }}
                    />
                )
            }
            render(() => <Component />)
        })
        return expect(promise).resolves.toEqual([true, "visible"])
    })

    test("animate visibility visible => hidden switches to hidden on animation end", async () => {
        const promise = new Promise((resolve) => {
            const Component = () => {
                const visibility = useMotionValue("hidden")
                let hasChecked = false

                return (
                    <motion.div
                        initial={{ visibility: "visible", opacity: 1 }}
                        animate={{ visibility: "hidden", opacity: 0 }}
                        style={{ visibility }}
                        transition={{ duration: 0.1 }}
                        onUpdate={(latest) => {
                            if (!hasChecked) {
                                expect(latest.visibility).toBe("visible")
                                hasChecked = true
                            }
                        }}
                        onAnimationComplete={() => {
                            resolve([hasChecked, visibility.get()])
                        }}
                    />
                )
            }
            render(() => <Component />)
        })
        return expect(promise).resolves.toEqual([true, "hidden"])
    })

    test("keyframes - accepts ease as an array", async () => {
        const promise = new Promise((resolve) => {
            const x = motionValue(0)
            const easingListener = jest.fn()
            const easing = (v: number) => {
                easingListener()
                return v
            }
            const onComplete = () => resolve(easingListener)
            const Component = () => (
                <motion.div
                    animate={{ x: [0, 1, 2] }}
                    transition={{ ease: [easing, easing], duration: 0.1 }}
                    style={{ x }}
                    onAnimationComplete={onComplete}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toHaveBeenCalled()
    })
    test("will switch from non-animatable value to animatable value", async () => {
        const promise = new Promise((resolve) => {
            const onComplete = () => resolve(container.firstChild as Element)
            const Component = () => (
                <motion.div
                    animate={{ fontWeight: 100 }}
                    style={{ fontWeight: "normal" }}
                    onAnimationComplete={onComplete}
                />
            )
            const { container } = render(() => <Component />)
        })
        return expect(promise).resolves.toHaveStyle("font-weight: 100")
    })
    test("doesn't animate no-op values", async () => {
        const promise = new Promise(async (resolve) => {
            let isAnimating = false
            const Component = () => (
                <motion.div
                    initial={{ opacity: 1, x: 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                        opacity: { duration: 2, type: "tween", velocity: 100 },
                        x: { type: "spring", velocity: 0 },
                    }}
                    onAnimationStart={() => {
                        isAnimating = true
                    }}
                    onAnimationComplete={() => {
                        isAnimating = false
                    }}
                />
            )
            render(() => <Component />)

            await nextFrame()
            await nextFrame()

            resolve(isAnimating)
        })

        return expect(promise).resolves.toBe(false)
    })
    test("doesn't animate no-op keyframes", async () => {
        const promise = new Promise(async (resolve) => {
            let isAnimating = false
            const Component = () => (
                <motion.div
                    initial={{ opacity: 1, x: 0 }}
                    animate={{ opacity: [1, 1], x: [0, 0] }}
                    transition={{
                        opacity: { duration: 2, type: "tween", velocity: 100 },
                        x: { type: "spring", velocity: 0 },
                    }}
                    onAnimationStart={() => {
                        isAnimating = true
                    }}
                    onAnimationComplete={() => {
                        isAnimating = false
                    }}
                />
            )
            render(() => <Component />)

            await nextFrame()
            await nextFrame()

            resolve(isAnimating)
        })

        return expect(promise).resolves.toBe(false)
    })
    test("does animate different keyframes", async () => {
        const promise = new Promise(async (resolve) => {
            let isAnimating = false
            const Component = () => (
                <motion.div
                    initial={{ opacity: 1, x: 0 }}
                    animate={{ opacity: [0, 1], x: [0, 1] }}
                    transition={{
                        opacity: { duration: 2, type: "tween", velocity: 100 },
                        x: { type: "spring", velocity: 0 },
                    }}
                    onAnimationStart={() => {
                        isAnimating = true
                    }}
                    onAnimationComplete={() => {
                        isAnimating = false
                    }}
                />
            )
            render(() => <Component />)

            await nextFrame()
            await nextFrame()

            resolve(isAnimating)
        })

        return expect(promise).resolves.toBe(true)
    })
    test("does animate no-op values if velocity is non-zero and animation type is spring", async () => {
        const promise = new Promise<boolean>((resolve) => {
            let isAnimating = false
            const Component = () => (
                <motion.div
                    initial={{ opacity: 1 }}
                    animate={{
                        opacity: 1,
                        transition: { type: "spring", velocity: 100 },
                    }}
                    onAnimationStart={() => {
                        isAnimating = true
                    }}
                    onAnimationComplete={() => {
                        isAnimating = false
                    }}
                />
            )
            render(() => <Component />)

            frame.postRender(() => {
                frame.postRender(() => resolve(isAnimating))
            })
        })

        return expect(promise).resolves.toBe(true)
    })
    test("doesn't animate zIndex", async () => {
        const promise = new Promise(async (resolve) => {
            const Component = () => <motion.div animate={{ zIndex: 100 }} />
            const { container } = render(() => <Component />)

            await nextFrame()
            resolve(container.firstChild as Element)
        })
        return expect(promise).resolves.toHaveStyle("z-index: 100")
    })

    test("when value is removed from animate, animates back to value originally defined in initial prop", async () => {
        return new Promise<void>(async (resolve) => {
            const ref = { current: null as HTMLElement | null }

            const props: any = {
                ref: (el: HTMLElement) => (ref.current = el),
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { type: false },
            }

            const [animate, setAnimate] = createSignal<any>(props.animate)
            render(() => <motion.div {...props} animate={animate()} />)

            await nextFrame()

            expect(ref.current).toHaveStyle("opacity: 1")

            setAnimate({})
            flush()

            await nextFrame()

            expect(ref.current).toHaveStyle("opacity: 0")

            resolve()
        })
    })

    test("when value is removed from animate, animates back to value currently defined in initial prop", async () => {
        return new Promise<void>(async (resolve) => {
            const ref = { current: null as HTMLElement | null }

            const props: any = {
                ref: (el: HTMLElement) => (ref.current = el),
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { type: false },
            }

            const [initial, setInitial] = createSignal<any>(props.initial)
            const [animate, setAnimate] = createSignal<any>(props.animate)
            render(() => (
                <motion.div
                    {...props}
                    initial={initial()}
                    animate={animate()}
                />
            ))

            await nextFrame()

            expect(ref.current).toHaveStyle("opacity: 1")

            setInitial({ opacity: 0.5 })
            setAnimate({})
            flush()

            await nextFrame()

            expect(ref.current).toHaveStyle("opacity: 0.5")

            resolve()
        })
    })

    test("when value is removed from both animate and initial, perform no animation", async () => {
        return new Promise<void>(async (resolve) => {
            const ref = { current: null as HTMLElement | null }

            const props: any = {
                ref: (el: HTMLElement) => (ref.current = el),
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { type: false },
            }

            const [initial, setInitial] = createSignal<any>(props.initial)
            const [animate, setAnimate] = createSignal<any>(props.animate)
            render(() => (
                <motion.div
                    {...props}
                    initial={initial()}
                    animate={animate()}
                />
            ))

            await nextFrame()

            expect(ref.current).toHaveStyle("opacity: 1")

            setInitial({})
            setAnimate({})
            flush()

            await nextFrame()

            expect(ref.current).toHaveStyle("opacity: 1")

            resolve()
        })
    })

    test("accepts default transition prop", async () => {
        const promise = new Promise((resolve) => {
            const x = motionValue(0)
            const opacity = motionValue(0)

            const Component = () => (
                <motion.div
                    animate={{ opacity: 1, x: 20 }}
                    transition={{
                        default: { type: false },
                        x: { type: "tween", from: 10, ease: () => 0.5 },
                    }}
                    onUpdate={() => {
                        frame.read(() => {
                            resolve([x.get(), opacity.get()])
                        })
                    }}
                    style={{ x, opacity }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toEqual([15, 1])
    })

    test("accepts base transition settings", async () => {
        const promise = new Promise((resolve) => {
            const x = motionValue(0)
            const opacity = motionValue(0)

            const Component = () => (
                <motion.div
                    animate={{ opacity: 1, x: 20 }}
                    transition={{
                        type: false,
                        duration: 1,
                        x: { type: "tween", from: 10, ease: () => 0.5 },
                    }}
                    onUpdate={() => {
                        frame.read(() => {
                            resolve([x.get(), opacity.get()])
                        })
                    }}
                    style={{ x, opacity }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toEqual([15, 1])
    })

    test("when value is removed from animate, animate back to value read from DOM", async () => {
        return new Promise<void>(async (resolve) => {
            const ref = { current: null as HTMLElement | null }

            const props: any = {
                ref: (el: HTMLElement) => (ref.current = el),
                style: { opacity: 0.5 },
                animate: { opacity: 1 },
                transition: { type: false },
            }

            const [animate, setAnimate] = createSignal<any>(props.animate)
            render(() => <motion.div {...props} animate={animate()} />)

            await nextFrame()

            expect(ref.current).toHaveStyle("opacity: 1")

            setAnimate({})
            flush()

            await nextFrame()

            expect(ref.current).toHaveStyle("opacity: 0.5")

            resolve()
        })
    })

    test("respects repeatDelay prop", async () => {
        const promise = new Promise<number>((resolve) => {
            const x = motionValue(0)
            x.on("change", () => {
                setTimeout(() => resolve(x.get()), 50)
            })
            const Component = () => (
                <motion.div
                    animate={{ x: [0, 20] }}
                    transition={{
                        x: {
                            type: "tween",
                            duration: 0,
                            repeatDelay: 0.1,
                            repeat: 1,
                            repeatType: "reverse",
                        },
                    }}
                    style={{ x }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBe(20)
    })

    test("Correctly applies final keyframe with repeatType reverse and odd numbered repeat", async () => {
        const promise = new Promise<number>((resolve) => {
            const x = motionValue(0)
            const Component = () => (
                <motion.div
                    animate={{ x: [0, 20] }}
                    transition={{
                        x: {
                            type: "tween",
                            duration: 0.1,
                            repeatDelay: 0.1,
                            repeat: 1,
                            repeatType: "reverse",
                        },
                    }}
                    onAnimationComplete={() => {
                        frame.postRender(() => resolve(x.get()))
                    }}
                    style={{ x }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBe(0)
    })

    test("Correctly applies final keyframe with repeatType mirror and odd numbered repeat", async () => {
        const promise = new Promise<number>((resolve) => {
            const x = motionValue(0)
            const Component = () => (
                <motion.div
                    animate={{ x: [0, 20] }}
                    transition={{
                        x: {
                            type: "tween",
                            duration: 0.1,
                            repeatDelay: 0.1,
                            repeat: 1,
                            repeatType: "mirror",
                        },
                    }}
                    onAnimationComplete={() => {
                        frame.postRender(() => resolve(x.get()))
                    }}
                    style={{ x }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBe(0)
    })

    test("Correctly applies final keyframe with repeatType loop and odd numbered repeat", async () => {
        const promise = new Promise<number>((resolve) => {
            const x = motionValue(0)
            const Component = () => (
                <motion.div
                    animate={{ x: [0, 20] }}
                    transition={{
                        x: {
                            type: "tween",
                            duration: 0.1,
                            repeatDelay: 0.1,
                            repeat: 1,
                            repeatType: "loop",
                        },
                    }}
                    onAnimationComplete={() => {
                        frame.postRender(() => resolve(x.get()))
                    }}
                    style={{ x }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBe(20)
    })

    test("Correctly applies final keyframe with repeatType reverse and even numbered repeat", async () => {
        const promise = new Promise<number>((resolve) => {
            const x = motionValue(0)
            const Component = () => (
                <motion.div
                    animate={{ x: [0, 20] }}
                    transition={{
                        x: {
                            type: "tween",
                            duration: 0.1,
                            repeatDelay: 0.1,
                            repeat: 2,
                            repeatType: "reverse",
                        },
                    }}
                    onAnimationComplete={() => {
                        frame.postRender(() => resolve(x.get()))
                    }}
                    style={{ x }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBe(20)
    })

    test("Correctly applies final keyframe with repeatType mirror and even numbered repeat", async () => {
        const promise = new Promise<number>((resolve) => {
            const x = motionValue(0)
            const Component = () => (
                <motion.div
                    animate={{ x: [0, 20] }}
                    transition={{
                        x: {
                            type: "tween",
                            duration: 0.1,
                            repeatDelay: 0.1,
                            repeat: 2,
                            repeatType: "mirror",
                        },
                    }}
                    onAnimationComplete={() => {
                        frame.postRender(() => resolve(x.get()))
                    }}
                    style={{ x }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBe(20)
    })

    test("Correctly applies final keyframe with repeatType loop and even numbered repeat", async () => {
        const promise = new Promise<number>((resolve) => {
            const x = motionValue(0)
            const Component = () => (
                <motion.div
                    animate={{ x: [0, 20] }}
                    transition={{
                        x: {
                            type: "tween",
                            duration: 0.1,
                            repeatDelay: 0.1,
                            repeat: 2,
                            repeatType: "loop",
                        },
                    }}
                    onAnimationComplete={() => {
                        frame.postRender(() => resolve(x.get()))
                    }}
                    style={{ x }}
                />
            )
            render(() => <Component />)
        })
        return expect(promise).resolves.toBe(20)
    })

    test("animates previously unseen properties, instant animation", async () => {
        const Component = (props: any) => (
            <motion.div animate={props.animate} transition={{ type: false }} />
        )
        const [animate, setAnimate] = createSignal<any>({ x: 100 })
        const { container } = render(() => <Component animate={animate()} />)

        setAnimate({ y: 100 })
        flush()

        await nextFrame()

        return expect(container.firstChild as Element).toHaveStyle(
            "transform: translateY(100px)"
        )
    })

    test("animates previously unseen properties", async () => {
        const Component = (props: any) => (
            <motion.div animate={props.animate} transition={{ duration: 0 }} />
        )
        const [animate, setAnimate] = createSignal<any>({ x: 100 })
        const { container } = render(() => <Component animate={animate()} />)

        setAnimate({ y: 100 })
        flush()

        await nextFrame()
        await nextFrame()

        return expect(container.firstChild as Element).toHaveStyle(
            "transform: translateY(100px)"
        )
    })

    test("converts unseen zero unit types to number", async () => {
        const promise = new Promise<ChildNode>((resolve) => {
            const Component = () => (
                <motion.div
                    animate={{ borderRadius: 20 }}
                    transition={{ duration: 0.01 }}
                    onAnimationComplete={() => {
                        resolve(container.firstChild as ChildNode)
                    }}
                    style={{ borderRadius: "0px" }}
                />
            )
            const { container } = render(() => <Component />)
        })

        return expect(promise).resolves.toHaveStyle("border-radius: 20px")
    })

    test("animates previously unseen CSS variables", async () => {
        const promise = new Promise<string>((resolve) => {
            let latestColor = ""
            const Component = () => (
                <motion.div
                    style={{ "--foo": "#fff" } as any}
                    animate={{ "--foo": "#000" } as any}
                    onUpdate={(latest) => {
                        latestColor = latest["--foo"] as string
                    }}
                    onAnimationComplete={() => {
                        resolve(latestColor)
                    }}
                    transition={{ type: false }}
                />
            )
            render(() => <Component />)
        })

        return expect(promise).resolves.toBe("#000")
    })

    test("doesn't render unseen values before their origin is read", async () => {
        const setProperty = jest.spyOn(
            CSSStyleDeclaration.prototype,
            "setProperty"
        )
        const { container } = render(() => (
            <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ "--foo": 100 } as any}
                transition={{ delay: 1 }}
            />
        ))
        const element = container.firstChild as HTMLElement
        element.style.opacity = ""

        // Flush the mount render, which runs before the origin is read
        await Promise.resolve()
        const { opacity } = element.style

        await nextFrame()
        const written = setProperty.mock.calls
            .filter(([name]) => name === "--foo")
            .map(([, value]) => value)
        setProperty.mockRestore()

        expect(opacity).toBe("0.5")
        expect(written).not.toContain(undefined)
    })

    test("animates a removed transform back to its default when initial is set", async () => {
        const check = async (initial: any) => {
            const Component = (props: any) => (
                <motion.div
                    initial={initial}
                    animate={props.animate}
                    variants={{ hidden: { opacity: 0 } }}
                    transition={{ duration: 0 }}
                />
            )
            const [animate, setAnimate] = createSignal<any>({
                opacity: 1,
                x: 100,
            })
            const { container } = render(() => (
                <Component animate={animate()} />
            ))
            await new Promise((resolve) => setTimeout(resolve, 50))
            setAnimate({ opacity: 1 })
            flush()
            await new Promise((resolve) => setTimeout(resolve, 50))
            await nextFrame()
            return (container.firstChild as HTMLElement).style.transform
        }

        expect(await check({ opacity: 0 })).toBe("none")
        expect(await check("hidden")).toBe("none")
    })

    test("renders an independent transform's base, and nothing before its origin is read", async () => {
        const transformOnMount = async (props: any) => {
            const { container } = render(() => (
                <motion.div transition={{ delay: 1 }} {...props} />
            ))
            const element = container.firstChild as HTMLElement
            const beforeMount = element.style.transform

            // Flush the mount render
            await Promise.resolve()
            return [beforeMount, element.style.transform]
        }

        // The origin can be read from the computed transform, so don't
        // overwrite it first
        expect(await transformOnMount({ animate: { x: 100 } })).toEqual([
            "",
            "",
        ])
        expect(
            await transformOnMount({ animate: { x: 100 }, style: { x: 20 } })
        ).toEqual(["translateX(20px)", "translateX(20px)"])
        expect(
            await transformOnMount({ animate: { x: 100 }, initial: { x: 10 } })
        ).toEqual(["translateX(10px)", "translateX(10px)"])
    })

    test("forces an animation to fallback if has been set to `null`", async () => {
        const promise = new Promise(async (resolve) => {
            const complete = () => resolve(true)
            const Component = (props: any) => (
                <motion.div
                    animate={props.animate}
                    onAnimationComplete={props.onAnimationComplete}
                    transition={{ type: false }}
                />
            )
            const [animate, setAnimate] = createSignal<any>({ x: 100 })
            const [onAnimationComplete, setOnAnimationComplete] =
                createSignal<any>(undefined)
            const { container } = render(() => (
                <Component
                    animate={animate()}
                    onAnimationComplete={onAnimationComplete()}
                />
            ))
            await nextFrame()
            setAnimate({ x: null })
            flush()
            await nextFrame()
            expect(container.firstChild as Element).toHaveStyle(
                "transform: none"
            )
            setAnimate({ x: 100 })
            setOnAnimationComplete(() => complete)
            flush()
        })
        return expect(promise).resolves.toBe(true)
    })
    test("mount animation doesn't run if `initial={false}`", async () => {
        const onComplete = jest.fn()
        const x = motionValue(0)
        const y = motionValue(0)
        const z = motionValue(0)
        const promise = new Promise<void>((resolve) => {
            const Component = () => (
                <motion.div
                    initial={false}
                    animate={{
                        x: 20,
                        y: 20,
                        transitionEnd: { x: 10, z: 20 },
                    }}
                    transition={{ type: false }}
                    style={{ x, y, z }}
                    onAnimationComplete={onComplete}
                />
            )
            render(() => <Component />)
            setTimeout(() => resolve(), 10)
        })
        await promise
        expect(onComplete).not.toBeCalled()
        expect([x.get(), y.get(), z.get()]).toEqual([10, 20, 20])
    })
    test("unmount cancels active animations", async () => {
        const promise = new Promise((resolve) => {
            const onComplete = jest.fn()
            const Component = (props: any) => (
                <Show when={props.isVisible}>
                    <motion.div
                        animate={{ x: 20 }}
                        transition={{ duration: 0.2 }}
                        onAnimationComplete={() => onComplete()}
                    />
                </Show>
            )
            const [isVisible, setIsVisible] = createSignal(true)
            render(() => <Component isVisible={isVisible()} />)
            setTimeout(() => {
                setIsVisible(false)
                flush()
            }, 100)
            setTimeout(() => {
                resolve(onComplete)
            }, 300)
        })
        return expect(promise).resolves.not.toBeCalled()
    })

    test("animate prop accepts pathOffset", () => {
        const Component = () => (
            <motion.div animate={{ pathOffset: 1, pathSpacing: 1 }} />
        )
        render(() => <Component />)
    })

    test("Correctly animates from RGB to HSLA", async () => {
        const element = await new Promise<HTMLDivElement>((resolve) => {
            const Component = () => {
                let ref: HTMLDivElement | undefined
                return (
                    <motion.div
                        ref={(el: HTMLDivElement) => (ref = el)}
                        initial={{ backgroundColor: "rgb(0, 153, 255)" }}
                        animate={{ backgroundColor: "hsl(345, 100%, 60%)" }}
                        onAnimationComplete={() => ref && resolve(ref)}
                        transition={{ duration: 0.01 }}
                    />
                )
            }
            render(() => <Component />)
        })

        return expect(element).toHaveStyle(
            "background-color: hsl(345, 100%, 60%)"
        )
    })

    test("Correctly animates from HEX to HSLA", async () => {
        const element = await new Promise<HTMLDivElement>((resolve) => {
            const Component = () => {
                let ref: HTMLDivElement | undefined
                return (
                    <motion.div
                        ref={(el: HTMLDivElement) => (ref = el)}
                        initial={{ backgroundColor: "#0088ff" }}
                        animate={{ backgroundColor: "hsl(345, 100%, 60%)" }}
                        onAnimationComplete={() => {
                            ref && resolve(ref)
                        }}
                        transition={{ duration: 0.01 }}
                    />
                )
            }
            render(() => <Component />)
        })

        return expect(element).toHaveStyle(
            "background-color: hsl(345, 100%, 60%)"
        )
    })

    test("Correctly animates from HSLA to Hex", async () => {
        const element = await new Promise<HTMLDivElement>((resolve) => {
            const Component = () => {
                let ref: HTMLDivElement | undefined
                return (
                    <motion.div
                        ref={(el: HTMLDivElement) => (ref = el)}
                        initial={{ backgroundColor: "hsla(345, 100%, 60%, 1)" }}
                        animate={{ backgroundColor: "#0088ff" }}
                        onAnimationComplete={() => ref && resolve(ref)}
                        transition={{ duration: 0.01 }}
                    />
                )
            }
            render(() => <Component />)
        })

        return expect(element).toHaveStyle(
            "background-color: rgba(0, 136, 255, 1)"
        )
    })

    test("Correctly animates from HSLA to RGB", async () => {
        const element = await new Promise<HTMLDivElement>((resolve) => {
            const Component = () => {
                let ref: HTMLDivElement | undefined
                return (
                    <motion.div
                        ref={(el: HTMLDivElement) => (ref = el)}
                        initial={{ backgroundColor: "hsla(345, 100%, 60%, 1)" }}
                        animate={{ backgroundColor: "rgba(0, 136, 255, 1)" }}
                        onAnimationComplete={() => ref && resolve(ref)}
                        transition={{ duration: 0.01 }}
                    />
                )
            }
            render(() => <Component />)
        })

        return expect(element).toHaveStyle(
            "background-color: rgba(0, 136, 255, 1)"
        )
    })

    test("animationStart event fires as expected", async () => {
        const testFn = await new Promise<Function>((resolve) => {
            const fn = jest.fn()
            const Component = () => {
                const x = useMotionValue(0)
                useMotionValueEvent(x, "animationStart", fn)

                return (
                    <motion.div
                        animate={{ x: 100 }}
                        transition={{ duration: 0.01 }}
                        style={{ x }}
                        onUpdate={() => resolve(fn)}
                    />
                )
            }
            render(() => <Component />)
        })

        return expect(testFn).toHaveBeenCalled()
    })

    test("doesn't error when provided unknown animation type", async () => {
        const Component = () => {
            return (
                <motion.div
                    animate={{ x: 100 }}
                    transition={{ type: "test" } as any}
                />
            )
        }
        render(() => <Component />)
    })

    test("correctly implements custom mix function", async () => {
        MotionGlobalConfig.mix = (() => () => "black") as any
        return new Promise<boolean>((resolve) => {
            const Component = () => {
                return (
                    <motion.div
                        initial={{ backgroundColor: "rgba(255, 255, 0, 1)" }}
                        animate={{
                            backgroundColor: "color(display-p3 0 1 0 / 0.5)",
                        }}
                        transition={{ duration: 0.1 } as any}
                        onUpdate={({ backgroundColor }) => {
                            expect(backgroundColor).toBe("black")
                            delete MotionGlobalConfig.mix
                            resolve(true)
                        }}
                    />
                )
            }
            render(() => <Component />)
        })
    })

    test("Correctly animates complex value types on first rerender", async () => {
        const result = await new Promise<string[]>((resolve) => {
            const output: string[] = []
            const Component = () => {
                return (
                    <motion.div
                        animate={{
                            background:
                                "linear-gradient(0deg, hsl(216, 100%, 50%) 0%, hsl(301, 100%, 50%) 100%)",
                        }}
                        onUpdate={({ background }) =>
                            output.push(background as string)
                        }
                        onAnimationComplete={() => resolve(output)}
                        style={{
                            background:
                                "linear-gradient(180deg, hsl(216, 100%, 50%) 0%, hsl(301, 100%, 50%) 100%)",
                        }}
                    />
                )
            }
            render(() => <Component />)
        })

        return expect(result.length).not.toBe(1)
    })

    test("Doesn't double-add listeners to externally-provided motion values", async () => {
        const result = await new Promise<number>((resolve) => {
            const Component = () => {
                const x = useMotionValue(0)
                return (
                    <motion.div
                        animate={{ x: 100 }}
                        transition={{ duration: 0.01 }}
                        onAnimationStart={() =>
                            resolve(countChangeSubscribers(x))
                        }
                        style={{ x }}
                    />
                )
            }
            render(() => <Component />)
        })

        return expect(result).toBe(1)
    })

    test("Positional values without specific handlers are not measured", async () => {
        const result = await new Promise<boolean>((resolve) => {
            const Component = () => {
                return (
                    <motion.div
                        initial={{ rotate: "10deg", x: 100 }}
                        animate={{ rotate: "2turn", x: 200 }}
                        transition={{ duration: 0.01 }}
                        onAnimationComplete={() => resolve(true)}
                    />
                )
            }
            render(() => <Component />)
        })

        return expect(result).toBe(true)
    })

    // Port note: React-specific. A re-suspended React boundary hides its content and re-runs
    // its layout effects on reveal (a remount for Motion, which replays the enter animation
    // from `initial`). Solid's `<Loading>` keeps the content's owner and elements across a
    // re-suspension, so nothing remounts and the running animation just continues.
    test.skip("Resets motion values to initial after Suspense remount", async () => {
        const opacity = motionValue(1)
        const scale = motionValue(1)

        let triggerSuspense: () => void
        let resolveSuspense: () => void

        /**
         * Port note: React's throw-a-promise suspension is a pending async read in Solid,
         * under a `<Loading on>` so that the already-revealed boundary shows its fallback.
         */
        const [suspended, setSuspended] = createSignal(false)
        const SuspendingChild = () => {
            triggerSuspense = () => setSuspended(true)
            const pending = createMemo(() => {
                if (suspended()) {
                    return new Promise<null>((resolve) => {
                        resolveSuspense = () => {
                            setSuspended(false)
                            resolve(null)
                        }
                    })
                }
                return null
            })

            return (
                <>
                    {pending()}
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.05 }}
                        style={{ opacity, scale }}
                    />
                </>
            )
        }

        const Component = () => (
            <Loading fallback={<div>Loading...</div>} on={suspended()}>
                <SuspendingChild />
            </Loading>
        )

        render(() => <Component />)

        // Wait for initial animation to progress
        await nextFrame()
        await nextFrame()
        flush()

        // Trigger suspension mid-animation
        triggerSuspense!()
        flush()
        await Promise.resolve()

        // Resolve suspension to remount
        resolveSuspense!()
        flush()
        await Promise.resolve()
        await Promise.resolve()
        flush()

        // After remount, values should be reset to initial (not stuck at
        // intermediate animation values)
        expect(opacity.get()).toBe(0)
        expect(scale.get()).toBe(0)
    })
})

/**
 * When an already-revealed Suspense boundary re-suspends and then resolves,
 * React re-attaches refs and re-runs layout effects, but content that bails
 * out of rendering (e.g. memoized by the React Compiler) doesn't re-run
 * passive effects.
 *
 * Port note: the boundary is Solid's `<Loading>`, re-suspended through its `on` prop by a
 * pending async read (an already-revealed `<Loading>` otherwise keeps its content shown).
 */
describe("Suspense boundary re-suspends and reveals memoized content", () => {
    const wait = async (ms: number) => {
        await new Promise<void>((resolve) => setTimeout(resolve, ms))
        flush()
    }

    function renderInSuspense(content: () => JSX.Element) {
        let resolveSuspense!: () => void
        const promise = new Promise<void>((resolve) => {
            resolveSuspense = resolve
        })
        let isResolved = false
        const [isSuspended, setSuspended] = createSignal(false)
        const suspend = () => setSuspended(true)

        const Suspender = () => {
            const pending = createMemo(() =>
                isSuspended() && !isResolved ? promise.then(() => null) : null
            )
            return <>{pending()}</>
        }

        const { container } = render(() => (
            <Loading
                fallback={<div data-testid="fallback" />}
                on={isSuspended()}
            >
                <Suspender />
                {content()}
            </Loading>
        ))

        const get = (testId: string) =>
            container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)

        const reSuspend = async () => {
            suspend()
            flush()
            await Promise.resolve()
            expect(get("fallback")).not.toBeNull()

            isResolved = true
            resolveSuspense()
            await Promise.resolve()
            flush()
            await wait(200)
            expect(get("fallback")).toBeNull()
        }

        return { get, reSuspend }
    }

    test("enter animation replays to completion", async () => {
        const { get, reSuspend } = renderInSuspense(() => (
            <motion.div
                data-testid="box"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.05 }}
            />
        ))

        await wait(200)
        expect(get("box")!.style.opacity).toBe("1")

        await reSuspend()
        expect(get("box")!.style.opacity).toBe("1")
    })

    test("children added after the reveal aren't staggered", async () => {
        let addItem!: () => void

        const List = () => {
            const [count, setCount] = createSignal(3)
            addItem = () => setCount((c) => c + 1)

            return (
                <motion.ul
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: {},
                        visible: {
                            transition: { delayChildren: stagger(0.2) },
                        },
                    }}
                >
                    <For each={Array.from({ length: count() }, (_, i) => i)}>
                        {(i) => (
                            <motion.li
                                data-testid={`item-${i}`}
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: {
                                        opacity: 1,
                                        transition: { duration: 0.05 },
                                    },
                                }}
                            />
                        )}
                    </For>
                </motion.ul>
            )
        }

        const { get, reSuspend } = renderInSuspense(() => <List />)

        await wait(600)
        await reSuspend()
        await wait(600)

        addItem()
        flush()
        await Promise.resolve()
        await wait(200)

        // Only item-3 is entering, so it shouldn't be delayed by 3 * 0.2s
        expect(get("item-3")!.style.opacity).toBe("1")
    })
})
