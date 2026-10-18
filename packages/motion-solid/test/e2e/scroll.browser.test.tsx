/**
 * Port of upstream's `cypress/integration/scroll.ts` and its pages,
 * `dev/react/src/tests/scroll-callback-first-frame.tsx`, `scroll-container.tsx`,
 * `scroll-callback-window.tsx`, `scroll-callback-window-x.tsx`, `scroll-callback-element.tsx`,
 * `scroll-callback-element-x.tsx`, `scroll-animate-window.tsx`, `scroll-animate-style.tsx`,
 * `scroll-default-ease.tsx`, `scroll-parallax.tsx`, `scroll-svg.tsx`, `scroll-fill-range.tsx`,
 * `scroll-explicit-height.tsx`, `scroll-progress-dynamic-content.tsx` and
 * `scroll-progress-dynamic-content-element.tsx`.
 */
import type { JSX } from "@solidjs/web"
import { createSignal, For, onSettled } from "solid-js"
import { page } from "vitest/browser"
import {
    animate,
    animateMini,
    frameData,
    motion,
    pipe,
    scroll,
    spring,
    useAnimate,
    useAnimateMini,
    useMotionValue,
    useMotionValueEvent,
    useScroll,
    useTransform,
    type AnimationOptions,
    type SolidAnimationScope,
} from "../../src"
import { query, should, visit, wait } from "./utils"

/**
 * Port note: `scroll()`'s options type doesn't declare `trackContentSize` (it's handled by
 * `scrollInfo`'s options, which `scroll()` passes on), like upstream's.
 */
type ScrollOptions = Parameters<typeof scroll>[1] & {
    trackContentSize?: boolean
}

const text = (selector: string) => query(selector).innerText

/**
 * `cy.scrollTo(x, y)` (on the window).
 */
const scrollTo = (x: number, y: number) => window.scrollTo(x, y)

/**
 * Pages
 */

const fixedTopLeft: JSX.CSSProperties = {
    position: "fixed",
    top: "0px",
    left: "0px",
}

const vhSpacer: JSX.CSSProperties = { height: "100vh" }

function ScrollCallbackFirstFrame() {
    const [progress, setProgress] = createSignal(0)

    onSettled(() =>
        scroll((p: number, info) => {
            console.log(p, info.y)
            setProgress(2 - p)
        })
    )

    return (
        <>
            <div style={{ ...vhSpacer, "background-color": "red" }} />
            <div style={{ ...vhSpacer, "background-color": "green" }} />
            <div style={{ ...vhSpacer, "background-color": "blue" }} />
            <div style={{ ...vhSpacer, "background-color": "yellow" }} />
            <div id="progress" style={fixedTopLeft}>
                {progress()}
            </div>
        </>
    )
}

function ScrollContainer() {
    const [container, setContainer] = createSignal<HTMLDivElement>()
    const [target, setTarget] = createSignal<HTMLDivElement>()
    const { scrollYProgress } = useScroll({
        container,
        target,
        offset: ["start start", "end start"],
    })

    useMotionValueEvent(scrollYProgress, "change", console.log)

    return (
        <>
            <div style={{ height: "100px", width: "100px" }}></div>
            <div
                id="container"
                ref={setContainer}
                style={{
                    "overflow-y": "auto",
                    height: "300px",
                    width: "300px",
                    position: "relative",
                }}
            >
                <div
                    style={{
                        height: "1000px",
                        width: "300px",
                        background: "red",
                    }}
                >
                    <div
                        ref={setTarget}
                        style={{
                            width: "100px",
                            height: "100px",
                            "font-size": "24px",
                            display: "flex",
                            background: "white",
                        }}
                    >
                        <motion.span id="label">{scrollYProgress}</motion.span>
                    </div>
                </div>
            </div>
        </>
    )
}

function ScrollCallbackWindow() {
    const [progress, setProgress] = createSignal(0)
    const [error, setError] = createSignal("")

    onSettled(() => {
        let prevFrameStamp = 0

        return scroll((p: number) => {
            setProgress(p)

            if (prevFrameStamp === frameData.timestamp) {
                setError("Concurrent event handlers detected")
            }

            prevFrameStamp = frameData.timestamp
        })
    })

    return (
        <>
            <div style={{ ...vhSpacer, "background-color": "red" }} />
            <div style={{ ...vhSpacer, "background-color": "green" }} />
            <div style={{ ...vhSpacer, "background-color": "blue" }} />
            <div style={{ ...vhSpacer, "background-color": "yellow" }} />
            <div id="progress" style={fixedTopLeft}>
                {progress()}
            </div>
            <div
                id="error"
                style={{ position: "fixed", bottom: "0px", left: "0px" }}
            >
                {error()}
            </div>
        </>
    )
}

function ScrollCallbackWindowX() {
    const [progress, setProgress] = createSignal(0)

    onSettled(() => {
        scroll(setProgress, { axis: "x" })
    })

    const spacer: JSX.CSSProperties = { width: "100vw", height: "500px" }

    return (
        <div
            style={{ width: "400vw", display: "flex", "flex-direction": "row" }}
        >
            <div style={{ ...spacer, "background-color": "red" }} />
            <div style={{ ...spacer, "background-color": "green" }} />
            <div style={{ ...spacer, "background-color": "blue" }} />
            <div style={{ ...spacer, "background-color": "yellow" }} />
            <div id="progress" style={fixedTopLeft}>
                {progress()}
            </div>
            <style>{`
  body {
    overflow-x: scroll!important;
    overflow-y: hidden;
  }
`}</style>
        </div>
    )
}

function ScrollCallbackElement() {
    const height = 400
    const [progress, setProgress] = createSignal(0)
    let ref: HTMLDivElement | undefined

    onSettled(() => {
        if (!ref) return
        return scroll((p: number) => setProgress(p), { source: ref })
    })

    const spacer: JSX.CSSProperties = { height: `${height}px` }

    return (
        <div
            id="scroller"
            ref={ref}
            style={{
                width: "100px",
                height: `${height}px`,
                overflow: "scroll",
            }}
        >
            <div style={{ ...spacer, "background-color": "red" }} />
            <div style={{ ...spacer, "background-color": "green" }} />
            <div style={{ ...spacer, "background-color": "blue" }} />
            <div style={{ ...spacer, "background-color": "yellow" }} />
            <div id="progress" style={fixedTopLeft}>
                {progress()}
            </div>
        </div>
    )
}

function ScrollCallbackElementX() {
    const width = 400
    const [progress, setProgress] = createSignal(0)
    let ref: HTMLDivElement | undefined

    onSettled(() => {
        if (!ref) return
        return scroll(
            (latest: number) => {
                console.log(latest)
                setProgress(latest)
            },
            { source: ref, axis: "x" }
        )
    })

    const spacer: JSX.CSSProperties = {
        width: `${width}px`,
        height: "200px",
        flex: `0 0 ${width}px`,
    }

    return (
        <div
            id="scroller"
            ref={ref}
            style={{
                height: "200px",
                width: `${width}px`,
                overflow: "scroll",
                display: "flex",
                "flex-direction": "row",
            }}
        >
            <div style={{ ...spacer, "background-color": "red" }} />
            <div style={{ ...spacer, "background-color": "green" }} />
            <div style={{ ...spacer, "background-color": "blue" }} />
            <div style={{ ...spacer, "background-color": "yellow" }} />
            <div id="progress" style={fixedTopLeft}>
                {progress()}
            </div>
        </div>
    )
}

const progressBoxStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 80,
    lineHeight: 80,
    fontWeight: "bold",
} as const

const progressBoxPlainStyle: JSX.CSSProperties = {
    position: "fixed",
    top: "0px",
    left: "0px",
    width: "100px",
    height: "100px",
    display: "flex",
    "justify-content": "center",
    "align-items": "center",
    "font-size": "80px",
    "line-height": "80px",
    "font-weight": "bold",
}

function ScrollAnimateWindow() {
    const progress = useMotionValue(0)

    onSettled(() => {
        const stopScrollAnimation = scroll(
            animate("#color", {
                x: [0, 100],
                opacity: [0, 1],
                backgroundColor: ["#fff", "#000"],
            })
        )

        const stopMiniScrollAnimation = scroll(
            animateMini("#color", {
                color: ["#000", "#fff"],
            })
        )

        const stopMotionValueAnimation = scroll(animate(progress, 100))

        return () => {
            stopScrollAnimation()
            stopMiniScrollAnimation()
            stopMotionValueAnimation()
        }
    })

    const progressDisplay = useTransform(() => Math.round(progress.get()))

    return (
        <>
            <div style={{ ...vhSpacer, "background-color": "red" }} />
            <div style={{ ...vhSpacer, "background-color": "green" }} />
            <div style={{ ...vhSpacer, "background-color": "blue" }} />
            <div style={{ ...vhSpacer, "background-color": "yellow" }} />
            <motion.div id="color" style={progressBoxStyle}>
                {progressDisplay}
            </motion.div>
        </>
    )
}

function ScrollAnimateStyle() {
    const [scope, miniAnimate] = useAnimateMini<HTMLDivElement>()

    onSettled(() => {
        if (!scope.current) return

        const stopMiniScrollAnimation = scroll(
            miniAnimate(scope.current, {
                backgroundColor: ["#fff", "#000"],
                color: ["#000", "#fff"],
            })
        )

        const stopScrollAnimation = scroll(
            animate(scope.current, { x: [0, 100] })
        )

        return () => {
            stopMiniScrollAnimation()
            stopScrollAnimation()
        }
    })

    return (
        <>
            <div style={{ ...vhSpacer, "background-color": "red" }} />
            <div style={{ ...vhSpacer, "background-color": "green" }} />
            <div style={{ ...vhSpacer, "background-color": "blue" }} />
            <div style={{ ...vhSpacer, "background-color": "yellow" }} />
            <div ref={scope} id="color" style={progressBoxPlainStyle}>
                A
            </div>
        </>
    )
}

function scrollAnimate(
    scope: SolidAnimationScope<HTMLDivElement>,
    animate: any,
    options?: AnimationOptions
) {
    if (!scope.current) return () => {}

    return scroll(
        animate(
            scope.current,
            { transform: ["translate(0px)", "translateX(100px)"] },
            options
        )
    )
}

function ScrollDefaultEase() {
    const [scopeDefault, miniAnimateDefault] = useAnimateMini<HTMLDivElement>()
    const [scopeEaseOut, miniAnimateEaseOut] = useAnimateMini<HTMLDivElement>()
    const [scopeSpring, miniAnimateSpring] = useAnimateMini<HTMLDivElement>()
    const [scopeAnimateDefault, animateDefault] = useAnimate<HTMLDivElement>()
    const [scopeAnimateEaseOut, animateEaseOut] = useAnimate<HTMLDivElement>()
    const [scopeAnimateSpring, animateSpring] = useAnimate<HTMLDivElement>()
    const [scopeAnimateMainThreadDefault, animateMainThreadDefault] =
        useAnimate<HTMLDivElement>()
    const [scopeAnimateMainThreadEaseOut, animateMainThreadEaseOut] =
        useAnimate<HTMLDivElement>()
    const [scopeAnimateMainThreadSpring, animateMainThreadSpring] =
        useAnimate<HTMLDivElement>()

    onSettled(() => {
        return pipe(
            scrollAnimate(scopeDefault, miniAnimateDefault),
            scrollAnimate(scopeEaseOut, miniAnimateEaseOut, {
                ease: "easeOut",
            }),
            scrollAnimate(scopeSpring, miniAnimateSpring, { type: spring }),
            scrollAnimate(scopeAnimateDefault, animateDefault),
            scrollAnimate(scopeAnimateEaseOut, animateEaseOut, {
                ease: "easeOut",
            }),
            scrollAnimate(scopeAnimateSpring, animateSpring, { type: spring }),
            scrollAnimate(
                scopeAnimateMainThreadDefault,
                animateMainThreadDefault,
                {
                    repeatDelay: 0.0001,
                }
            ),
            scrollAnimate(
                scopeAnimateMainThreadEaseOut,
                animateMainThreadEaseOut,
                {
                    ease: "easeOut",
                    repeatDelay: 0.0001,
                }
            ),
            scrollAnimate(
                scopeAnimateMainThreadSpring,
                animateMainThreadSpring,
                {
                    type: spring,
                    repeatDelay: 0.0001,
                }
            )
        ) as () => void
    })

    const progressStyle: JSX.CSSProperties = {
        width: "100px",
        height: "100px",
        "background-color": "white",
        color: "black",
    }

    return (
        <div style={{ height: "500vh" }}>
            <div
                style={{
                    position: "fixed",
                    top: "0px",
                    left: "0px",
                    width: "100%",
                    height: "100%",
                }}
            >
                <div ref={scopeDefault} style={progressStyle}>
                    mini - default
                </div>
                <div ref={scopeEaseOut} style={progressStyle}>
                    mini - easeOut
                </div>
                <div ref={scopeSpring} style={progressStyle}>
                    mini - spring
                </div>
                <div ref={scopeAnimateDefault} style={progressStyle}>
                    animate - default
                </div>
                <div ref={scopeAnimateEaseOut} style={progressStyle}>
                    animate - easeOut
                </div>
                <div ref={scopeAnimateSpring} style={progressStyle}>
                    animate - spring
                </div>
                <div ref={scopeAnimateMainThreadDefault} style={progressStyle}>
                    animate main thread - default
                </div>
                <div ref={scopeAnimateMainThreadEaseOut} style={progressStyle}>
                    animate main thread - easeOut
                </div>
                <div ref={scopeAnimateMainThreadSpring} style={progressStyle}>
                    animate main thread - spring
                </div>
            </div>
        </div>
    )
}

function ScrollParallax() {
    onSettled(() => {
        const distance = 400
        document.querySelectorAll(".img-container").forEach((section) => {
            const mainThreadSentinel = section.querySelector(
                ".sentinel.main-thread"
            )
            const waapiSentinel = section.querySelector(".sentinel.waapi")
            const miniSentinel = section.querySelector(".sentinel.mini")

            if (!mainThreadSentinel || !waapiSentinel || !miniSentinel) return

            scroll(
                animate(mainThreadSentinel, {
                    y: [-distance, distance],
                }),
                { target: mainThreadSentinel }
            )

            scroll(
                animate(waapiSentinel, {
                    transform: [
                        `translateY(-${distance}px)`,
                        `translateY(${distance}px)`,
                    ],
                }),
                { target: waapiSentinel }
            )

            scroll(
                animate(miniSentinel, {
                    transform: [
                        `translateY(-${distance}px)`,
                        `translateY(${distance}px)`,
                    ],
                }),
                { target: miniSentinel }
            )
        })
    })

    return (
        <>
            <For each={[0, 1, 2, 3, 4]}>
                {() => (
                    <section class="img-container">
                        <div>
                            <div class="img-placeholder" />
                            <div class="main-thread sentinel" />
                            <div class="waapi sentinel" />
                            <div class="mini sentinel" />
                        </div>
                    </section>
                )}
            </For>
            <style>{`
      html {
        scroll-snap-type: y mandatory;
    }

    .img-container {
        height: 100vh;
        scroll-snap-align: start;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
    }

    .img-container > div {
        width: 300px;
        height: 400px;
        margin: 20px;
        background: var(--white);
        overflow: hidden;
    }

    .img-container .img-placeholder {
        width: 300px;
        height: 400px;
        background-color: #000;
    }

    .img-container .sentinel {
        position: absolute;
        top: calc(50% - 50px);
        left: 50%;
        width: 100px;
        height: 100px;
        background-color: blue;
    }

    .waapi.sentinel {
       background-color: red;
    }

    .mini.sentinel {
        background-color: green;
    }

    .progress {
        position: fixed;
        left: 0;
        right: 0;
        height: 5px;
        background: var(--accent);
        bottom: 50px;
        transform: scaleX(0);
    }
  `}</style>
        </>
    )
}

function ScrollSvg() {
    const [rect, setRect] = createSignal<SVGRectElement>()
    const [svg, setSvg] = createSignal<SVGSVGElement>()

    // Port note: `useScroll`'s ref types are `HTMLElement`, upstream's React refs aren't checked.
    const rectValues = useScroll({
        target: rect as any,
        offset: ["start end", "end start"],
    })

    const svgValues = useScroll({
        target: svg as any,
        offset: ["start end", "end start"],
    })

    const fixed = {
        position: "fixed",
        top: 10,
        left: 10,
    } as const

    return (
        <>
            <div
                style={{
                    "padding-top": "400px",
                    "padding-bottom": "400px",
                }}
            >
                <svg
                    ref={setSvg}
                    viewBox="0 0 200 200"
                    width="200"
                    height="200"
                >
                    <rect
                        ref={setRect}
                        width="100"
                        height="100"
                        x="50"
                        y="50"
                        fill="red"
                    />
                </svg>
            </div>
            <motion.div style={{ ...fixed, color: "white" }} id="rect-progress">
                {rectValues.scrollYProgress}
            </motion.div>
            <motion.div
                style={{ ...fixed, top: 50, color: "white" }}
                id="svg-progress"
            >
                {svgValues.scrollYProgress}
            </motion.div>
        </>
    )
}

function ScrollFillRange() {
    const content = useMotionValue(0.5)

    onSettled(() => {
        scroll((p: number) => content.set(p), {
            target: document.querySelector("section") as HTMLElement,
        })
    })

    return (
        <>
            <div style={{ height: "50vh" }} />
            <section
                style={{
                    height: "100vh",
                    display: "flex",
                    "justify-content": "center",
                    "align-items": "center",
                    color: "white",
                }}
            >
                <motion.pre id="content">{content}</motion.pre>
            </section>
        </>
    )
}

function BubbleParallax(props: {
    children: JSX.Element
    id: string
    containerRef: () => HTMLDivElement | undefined
}) {
    const [ref, setRef] = createSignal<HTMLDivElement>()

    const { scrollYProgress } = useScroll({
        target: ref,
        // eslint-disable-next-line solid/reactivity
        container: props.containerRef,
        offset: ["start end", "end start"],
    })

    const opacity = useTransform(scrollYProgress, (progressValue: number) => {
        const axis = 2 * progressValue - 1
        return -Math.abs(axis) + 1
    })

    return (
        <motion.div
            id={props.id}
            ref={setRef}
            style={{
                opacity,
                marginBottom: "50px",
            }}
        >
            {props.children}
        </motion.div>
    )
}

function ScrollExplicitHeight() {
    const [scrollContainer, setScrollContainer] = createSignal<HTMLDivElement>()

    return (
        <div
            style={{
                display: "flex",
                "justify-content": "center",
                "align-items": "center",
                height: "100vh",
                "background-color": "#E0E0E0",
            }}
        >
            <div
                id="scroll-container"
                ref={setScrollContainer}
                style={{
                    width: "100%",
                    height: "80vh",
                    "overflow-y": "scroll",
                    "background-color": "#1A237E",
                    padding: "20px",
                    "box-sizing": "border-box",
                    "border-radius": "8px",
                }}
            >
                <div
                    style={{
                        color: "white",
                        "text-align": "center",
                        "font-size": "2rem",
                        padding: "40px 0",
                    }}
                >
                    Parallax Area
                </div>

                <For each={[...Array(10).keys()]}>
                    {(index) => (
                        <BubbleParallax
                            containerRef={scrollContainer}
                            id={"item-" + index}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    "align-items": "center",
                                    "justify-content": "center",
                                    width: "100%",
                                    height: "300px",
                                    "background-color": "#BBDEFB",
                                    "font-size": "5rem",
                                    color: "#1A237E",
                                    "border-radius": "10px",
                                }}
                            >
                                {index + 1}
                            </div>
                        </BubbleParallax>
                    )}
                </For>
            </div>
        </div>
    )
}

function ScrollProgressDynamicContent() {
    const [progress, setProgress] = createSignal(0)
    const [showExtraContent, setShowExtraContent] = createSignal(false)

    onSettled(() =>
        scroll((p: number) => setProgress(p), {
            trackContentSize: true,
        } as ScrollOptions)
    )

    onSettled(() => {
        const timer = setTimeout(() => setShowExtraContent(true), 500)
        return () => clearTimeout(timer)
    })

    return (
        <>
            <div style={{ ...vhSpacer, "background-color": "red" }} />
            <div style={{ ...vhSpacer, "background-color": "green" }} />
            {showExtraContent() && (
                <>
                    <div
                        id="extra-content"
                        style={{ ...vhSpacer, "background-color": "purple" }}
                    />
                    <div
                        style={{ ...vhSpacer, "background-color": "orange" }}
                    />
                </>
            )}
            <div id="progress" style={fixedTopLeft}>
                {progress().toFixed(4)}
            </div>
            <div id="content-loaded">
                {showExtraContent() ? "loaded" : "loading"}
            </div>
        </>
    )
}

function ScrollProgressDynamicContentElement() {
    const height = 400
    const [progress, setProgress] = createSignal(0)
    const [showExtraContent, setShowExtraContent] = createSignal(false)
    let ref: HTMLDivElement | undefined

    onSettled(() => {
        if (!ref) return
        return scroll((p: number) => setProgress(p), {
            source: ref,
            trackContentSize: true,
        } as ScrollOptions)
    })

    onSettled(() => {
        const timer = setTimeout(() => setShowExtraContent(true), 500)
        return () => clearTimeout(timer)
    })

    const spacer: JSX.CSSProperties = { height: `${height}px` }

    return (
        <div
            id="scroller"
            ref={ref}
            style={{
                width: "100px",
                height: `${height}px`,
                overflow: "scroll",
            }}
        >
            <div style={{ ...spacer, "background-color": "red" }} />
            <div style={{ ...spacer, "background-color": "green" }} />
            {showExtraContent() && (
                <>
                    <div
                        id="extra-content"
                        style={{ ...spacer, "background-color": "purple" }}
                    />
                    <div style={{ ...spacer, "background-color": "orange" }} />
                </>
            )}
            <div id="progress" style={fixedTopLeft}>
                {progress().toFixed(4)}
            </div>
            <div
                id="content-loaded"
                style={{ position: "fixed", top: "20px", left: "0px" }}
            >
                {showExtraContent() ? "loaded" : "loading"}
            </div>
        </div>
    )
}

/**
 * `.get("div").contains(text)`
 */
function divContaining(content: string) {
    const div = Array.from(document.querySelectorAll("div")).find(
        (element) => element.textContent?.trim() === content
    )
    if (!div) throw new Error(`No div contains "${content}"`)
    return div
}

/**
 * Specs
 */

describe("scroll() callbacks", () => {
    it("Fires callback on first frame, before scroll event", async () => {
        await visit(ScrollCallbackFirstFrame)
        await wait(100)
        await should(() => {
            expect(text("#progress")).toBe("2")
        })
    })

    it("Correctly updates window scroll progress callback", async () => {
        await visit(ScrollContainer)
        await wait(100)

        query("#container").scrollTo(0, 50)
        await should(() => {
            expect(text("#label")).toBe("0.5")
        })
    })

    it("Correctly measures scroll position", async () => {
        await visit(ScrollCallbackWindow)
        await wait(100)
        await page.viewport(100, 400)

        scrollTo(0, 600)
        await wait(200)
        await should(() => {
            expect(text("#progress")).toBe("0.5")
        })
        await page.viewport(100, 800)
        await wait(200)
        await should(() => {
            expect(text("#progress")).toBe("0.25")
        })

        await should(() => {
            expect(text("#error")).toBe("")
        })
    })

    it("Correctly updates window scroll progress callback, x axis", async () => {
        await visit(ScrollCallbackWindowX)
        await wait(100)
        await page.viewport(400, 100)

        scrollTo(600, 0)
        await wait(200)
        await should(() => {
            expect(text("#progress")).toBe("0.5")
        })
        await page.viewport(800, 100)
        await wait(200)
        await should(() => {
            expect(text("#progress")).toBe("0.25")
        })
    })

    it("Correctly updates element scroll progress callback", async () => {
        await visit(ScrollCallbackElement)
        await wait(100)

        query("#scroller").scrollTo(0, 600)
        await wait(200)
        await should(() => {
            const progress = parseFloat(text("#progress"))
            const isClose = progress >= 0.49 && progress <= 0.51
            expect(isClose).toBe(true)
        })
    })

    it("Correctly updates element scroll progress callback, x axis", async () => {
        await visit(ScrollCallbackElementX)
        await wait(100)

        query("#scroller").scrollTo(600, 0)
        await wait(200)
        await should(() => {
            const progress = parseFloat(text("#progress"))
            const isClose = progress >= 0.49 && progress <= 0.51
            expect(isClose).toBe(true)
        })
    })
})

describe("scroll() animation", () => {
    it("Updates animation on first frame, before scroll event", async () => {
        await visit(ScrollAnimateWindow)
        await wait(100)
        await should(() => {
            expect(getComputedStyle(query("#color")).backgroundColor).toBe(
                "rgb(255, 255, 255)"
            )
        })
    })

    it("Correctly updates window scroll progress callback", async () => {
        await visit(ScrollAnimateWindow)
        await wait(100)
        await page.viewport(100, 400)

        scrollTo(0, 600)
        await wait(200)
        await should(() => {
            const element = query("#color")
            // backgroundColor is WAAPI-accelerated so the browser interpolates in sRGB
            expect(getComputedStyle(element).backgroundColor).toBe(
                "rgb(128, 128, 128)"
            )

            // This is animated by animate mini and thus doesn't use linear RGB mixing
            expect(getComputedStyle(element).color).toBe("rgb(128, 128, 128)")

            expect(getComputedStyle(element).opacity).toBe("0.5")
            expect(element.style.transform).toBe("translateX(50px)")

            expect(element.innerText).toBe("50")
        })
        await page.viewport(100, 800)
        await wait(200)
        await should(() => {
            const element = query("#color")
            expect(getComputedStyle(element).backgroundColor).toBe(
                "rgb(191, 191, 191)"
            )
            expect(getComputedStyle(element).color).toBe("rgb(64, 64, 64)")
        })
    })

    it("With useAnimateMini, updates animation on first frame, before scroll event", async () => {
        await visit(ScrollAnimateStyle)
        await wait(100)
        await should(() => {
            expect(getComputedStyle(query("#color")).backgroundColor).toBe(
                "rgb(255, 255, 255)"
            )
        })
    })

    it("Correctly applies the same easing to both useAnimate and useAnimateMini", async () => {
        await visit(ScrollDefaultEase)
        await wait(100)
        await page.viewport(400, 400)

        // Scroll halfway down the page
        scrollTo(0, 1250)
        await wait(200)

        // Get all the elements we need to compare
        const miniDefaultBounds =
            divContaining("mini - default").getBoundingClientRect()
        const animateDefaultBounds =
            divContaining("animate - default").getBoundingClientRect()
        const miniEaseOutBounds =
            divContaining("mini - easeOut").getBoundingClientRect()
        const animateEaseOutBounds =
            divContaining("animate - easeOut").getBoundingClientRect()
        const miniSpringBounds =
            divContaining("mini - spring").getBoundingClientRect()
        const animateMainThreadDefaultBounds = divContaining(
            "animate main thread - default"
        ).getBoundingClientRect()
        const animateMainThreadEaseOutBounds = divContaining(
            "animate main thread - easeOut"
        ).getBoundingClientRect()
        const animateMainThreadSpringBounds = divContaining(
            "animate main thread - spring"
        ).getBoundingClientRect()

        // Both default boxes should have the same position
        expect(miniDefaultBounds.left).toBe(animateDefaultBounds.left)

        // Both easeOut boxes should have the same position
        expect(miniEaseOutBounds.left).toBe(animateEaseOutBounds.left)

        expect(animateMainThreadDefaultBounds.left).toBe(
            animateDefaultBounds.left
        )
        expect(Math.round(animateMainThreadEaseOutBounds.left)).toBe(
            Math.round(animateEaseOutBounds.left)
        )

        // Skipping as env doesn't support linear() easing
        // expect(miniSpringBounds.left).toBe(animateSpringBounds.left)

        // Each easing type should have different positions
        expect(miniDefaultBounds.left).not.toBe(miniEaseOutBounds.left)
        expect(miniDefaultBounds.left).not.toBe(miniSpringBounds.left)
        expect(animateMainThreadDefaultBounds.left).not.toBe(
            animateMainThreadEaseOutBounds.left
        )
        expect(animateMainThreadDefaultBounds.left).not.toBe(
            animateMainThreadSpringBounds.left
        )
    })

    it("correctly applies parallax animations", async () => {
        await visit(ScrollParallax)
        await page.viewport(1000, 500)
        await wait(200)
        await should(() => {
            expect(
                query(
                    ".img-container:first-child .main-thread.sentinel"
                ).getBoundingClientRect().top
            ).toBe(200)
        })
        await should(() => {
            expect(
                query(
                    ".img-container:first-child .waapi.sentinel"
                ).getBoundingClientRect().top
            ).toBe(200)
        })
        await should(() => {
            expect(
                query(
                    ".img-container:first-child .waapi.sentinel"
                ).getBoundingClientRect().top
            ).toBe(200)
        })
    })
})

describe("SVG", () => {
    it("tracks SVG elements as target", async () => {
        await visit(ScrollSvg)
        await wait(100)
        await page.viewport(100, 400)
        await should(() => expect(text("#rect-progress")).toBe("0"))
        await should(() => expect(text("#svg-progress")).toBe("0"))
        scrollTo(0, 25)
        await should(() => expect(text("#rect-progress")).toBe("0"))
        await should(() => expect(text("#svg-progress")).not.toBe("0"))
        scrollTo(0, 75)
        await should(() => expect(text("#rect-progress")).not.toBe("0"))
        await should(() => expect(text("#svg-progress")).not.toBe("0"))
        scrollTo(0, 500)
        await should(() => expect(text("#rect-progress")).not.toBe("1"))
        await should(() => expect(text("#svg-progress")).not.toBe("1"))
        scrollTo(0, 600)
        await should(() => expect(text("#rect-progress")).toBe("1"))
        await should(() => expect(text("#svg-progress")).toBe("1"))
    })
})

describe("scroll() full height target", () => {
    it("doesn't return progress 1 before it hits its first offset", async () => {
        await visit(ScrollFillRange)
        await wait(100)
        await should(() => {
            expect(text("#content")).toBe("0")
        })
    })
})

describe.skip("scroll() container tracking", () => {
    it("correctly tracks position of a target with container of fixed height", async () => {
        await visit(ScrollExplicitHeight)
        await page.viewport(800, 500)
        await wait(100)
        query("#scroll-container").scrollTo(0, 139)
        await wait(100)
        await should(() => {
            expect(parseInt(query("#item-0").style.opacity)).toBe(1)
        })
        query("#scroll-container").scrollTo(0, 1000)
        await wait(100)
        await should(() => {
            const opacity = query("#item-2").style.opacity
            expect(opacity).not.toBe("0")
            expect(opacity).not.toBe("1")
        })
    })
})

describe("scroll() dynamic content", () => {
    it("Recalculates window scrollYProgress when content is added below", async () => {
        await visit(ScrollProgressDynamicContent)
        await wait(100)
        await page.viewport(100, 400)

        // Scroll to bottom (100% with 2 screens of content)
        scrollTo(0, document.documentElement.scrollHeight)
        await wait(200)
        await should(() => {
            expect(parseFloat(text("#progress"))).toBeGreaterThan(0.95)
        })

        // Wait for dynamic content to load
        await should(() => {
            expect(query("#content-loaded").textContent).toContain("loaded")
        })
        await wait(200)

        // Progress should recalculate WITHOUT scrolling - now we're ~50% down
        await should(() => {
            expect(parseFloat(text("#progress"))).toBeLessThan(0.7)
        })
    })

    it("Recalculates element scrollYProgress when content is added", async () => {
        await visit(ScrollProgressDynamicContentElement)
        await wait(100)

        // Scroll to bottom of element (100% with 2 screens of content)
        const scroller = query("#scroller")
        scroller.scrollTo(0, scroller.scrollHeight)
        await wait(200)
        await should(() => {
            expect(parseFloat(text("#progress"))).toBeGreaterThan(0.95)
        })

        // Wait for dynamic content to load
        await should(() => {
            expect(query("#content-loaded").textContent).toContain("loaded")
        })
        await wait(200)

        // Progress should recalculate WITHOUT scrolling - now we're ~50% down
        await should(() => {
            expect(parseFloat(text("#progress"))).toBeLessThan(0.7)
        })
    })
})
