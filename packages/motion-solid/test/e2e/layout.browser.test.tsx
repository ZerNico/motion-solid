/**
 * Port of upstream's `cypress/integration/layout.ts` and the pages it visits,
 * `dev/react/src/tests/layout.tsx`, `layout-block-interrupt.tsx`, `layout-dependency.tsx`,
 * `layout-dependency-child.tsx`, `layout-shared-dependency.tsx`,
 * `layout-scaled-child-in-transformed-parent.tsx`, `layout-repeat-new.tsx`, `layout-portal.tsx`,
 * `layout-rerender.tsx` and `layout-crossfade.tsx`.
 */
import { Portal } from "@solidjs/web"
import { createEffect, createSignal, For, Show as SolidShow } from "solid-js"
import {
    AnimatePresence,
    motion,
    MotionConfig,
    Show,
    useMotionValue,
    type Variants,
} from "../../src"
import { query, should, trigger, visit, wait, type BoundingBox } from "./utils"

/**
 * Upstream's local `expectBbox` (not rounded).
 */
function expectBbox(element: Element, expectedBbox: Partial<BoundingBox>) {
    const bbox = element.getBoundingClientRect()
    if (expectedBbox.left !== undefined)
        expect(bbox.left).toBe(expectedBbox.left)
    if (expectedBbox.top !== undefined) expect(bbox.top).toBe(expectedBbox.top)
    if (expectedBbox.width !== undefined)
        expect(bbox.width).toBe(expectedBbox.width)
    if (expectedBbox.height !== undefined)
        expect(bbox.height).toBe(expectedBbox.height)
}

const box = {
    position: "absolute",
    top: 0,
    left: 0,
    background: "red",
} as const

const a = {
    ...box,
    width: 100,
    height: 200,
}

const b = {
    ...box,
    top: 100,
    left: 200,
    width: 300,
    height: 300,
}

/**
 * `?test=layout`
 */
function Layout(props: { type?: true | "position" | "size" | "x" | "y" }) {
    const [state, setState] = createSignal(true)
    const backgroundColor = useMotionValue("red")

    return (
        <motion.div
            id="box"
            data-testid="box"
            layout={props.type || true}
            style={{ ...(state() ? a : b), backgroundColor }}
            onClick={() => setState(!state())}
            transition={{ duration: 0.5, ease: () => 0.5 }}
            onLayoutAnimationStart={() => backgroundColor.set("green")}
            onLayoutAnimationComplete={() => backgroundColor.set("blue")}
        />
    )
}

/**
 * `?test=layout-block-interrupt`
 */
function LayoutBlockInterrupt() {
    const [count, setCount] = createSignal(0)

    return (
        <motion.div
            id="box"
            data-testid="box"
            layout
            style={count() === 0 ? a : b}
            onClick={() => setCount(count() + 1)}
            transition={{ duration: 10, ease: () => 0.5 }}
        />
    )
}

/**
 * `?test=layout-dependency`
 */
function LayoutDependency(props: { type?: true | "position" | "size" }) {
    const [state, setState] = createSignal(true)
    const backgroundColor = useMotionValue("red")

    return (
        <motion.div
            id="box"
            data-testid="box"
            layout={props.type || true}
            layoutDependency={0}
            style={{ ...(state() ? a : b), backgroundColor }}
            onClick={() => setState(!state())}
            transition={{ duration: 0.15, ease: () => 0.5 }}
            onLayoutAnimationComplete={() => backgroundColor.set("blue")}
        />
    )
}

/**
 * `?test=layout-dependency-child`
 */
function LayoutDependencyChild() {
    const [divState, setDivState] = createSignal(false)
    const [animating, setAnimating] = createSignal(false)
    const [transitionId, setTransitionId] = createSignal(0)

    const duration = 10
    const commonVariant = {
        position: "absolute",
        boxSizing: "border-box",
        left: 25,
        width: 100,
        height: 25,
        backgroundColor: "blue",
    } as const

    const variants: Variants = {
        visible: {
            opacity: 1,
            ...commonVariant,
        },
        hidden: {
            opacity: 0,
            ...commonVariant,
        },
    }

    const layoutDependency = () => (animating() ? transitionId() : -1)

    return (
        <>
            <motion.div
                layoutDependency={layoutDependency()}
                layout
                onAnimationComplete={() => setAnimating(false)}
                class={divState() ? "outerAnimate" : "outer"}
                transition={{ duration, ease: () => 0.5 }}
            >
                <AnimatePresence>
                    <Show when={!divState()}>
                        <motion.div
                            layout
                            id="child"
                            layoutDependency={layoutDependency()}
                            variants={variants}
                            animate="visible"
                            exit="hidden"
                            initial="hidden"
                            transition={{
                                duration,
                                ease: () => 0.5,
                                repeatDelay: 0.001,
                            }}
                        />
                    </Show>
                </AnimatePresence>
            </motion.div>

            <button
                style={{ position: "absolute", right: "10px", top: "10px" }}
                onClick={() => {
                    setDivState(!divState())
                    setTransitionId(transitionId() + 1)
                    setAnimating(true)
                }}
            >
                Animate
            </button>
            <style>
                {`
                .outer {
                    width: 200px;
                    height: 100px;
                    top: 10px;
                    left: 10px;
                    position: absolute;
                    background-color: red;
                    overflow: visible;
                }

                .outerAnimate {
                    /* Height and width are the only things that's changing */
                    width: 100px;
                    height: 75px;
                    top: 10px;
                    left: 10px;
                    position: absolute;
                    background-color: red;
                    overflow: visible;
                }

                .border {
                    /* Border div has inset: 0 so should follow the size of its parent (outer/outerAnimate) */
                    inset: 0;
                    position: absolute;
                    box-sizing: border-box;
                }
`}
            </style>
        </>
    )
}

/**
 * `?test=layout-shared-dependency`
 */
function Items() {
    const [selected, setSelected] = createSignal(0)
    const backgroundColor = useMotionValue("#f00")

    return (
        <>
            <article style={{ "margin-bottom": "20px" }}>
                <button id="jump-0" onClick={() => setSelected(0)}>
                    Jump here
                </button>
                <SolidShow when={selected() === 0}>
                    <motion.div
                        id="box"
                        layoutId="box"
                        layoutDependency={selected()}
                        style={{
                            width: 100,
                            height: 100,
                            backgroundColor,
                            borderRadius: 10,
                        }}
                        transition={{ duration: 0.5, ease: () => 0.5 }}
                        onLayoutAnimationStart={() =>
                            backgroundColor.set("#0f0")
                        }
                        onLayoutAnimationComplete={() =>
                            backgroundColor.set("#00f")
                        }
                    />
                </SolidShow>
            </article>
            <article>
                <button id="jump-1" onClick={() => setSelected(1)}>
                    Jump here
                </button>
                <SolidShow when={selected() === 1}>
                    <motion.div
                        id="box"
                        layoutId="box"
                        layoutDependency={selected()}
                        style={{
                            width: 100,
                            height: 100,
                            backgroundColor,
                            borderRadius: 10,
                        }}
                        transition={{ duration: 0.5, ease: () => 0.5 }}
                        onLayoutAnimationStart={() =>
                            backgroundColor.set("#0f0")
                        }
                        onLayoutAnimationComplete={() =>
                            backgroundColor.set("#00f")
                        }
                    />
                </SolidShow>
            </article>
        </>
    )
}

function SectionA() {
    return (
        <div id="section-a">
            <p>Section A Header</p>
            <Items />
        </div>
    )
}

function SectionB() {
    return (
        <div id="section-b">
            <Items />
        </div>
    )
}

function LayoutSharedDependency() {
    const [section, setSection] = createSignal<"a" | "b">("a")

    return (
        <div style={{ position: "relative" }}>
            <div style={{ "margin-bottom": "20px" }}>
                <button id="section-a-btn" onClick={() => setSection("a")}>
                    Section A
                </button>
                <button
                    id="section-b-btn"
                    onClick={() => setSection("b")}
                    style={{ "margin-left": "10px" }}
                >
                    Section B
                </button>
            </div>

            <SolidShow when={section() === "a"}>
                <SectionA />
            </SolidShow>
            <SolidShow when={section() === "b"}>
                <SectionB />
            </SolidShow>
        </div>
    )
}

/**
 * `?test=layout-scaled-child-in-transformed-parent`
 */
function LayoutScaledChildInTransformedParent() {
    const [hover, setHover] = createSignal(false)

    const scaledBox = {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        background: "red",
    } as const

    const scaledA = { ...scaledBox }
    const scaledB = { ...scaledBox, left: 50 }

    return (
        <motion.div style={{ width: 400, height: 400, position: "relative" }}>
            <motion.div
                id="parent"
                layout
                style={{
                    position: "absolute",
                    width: 100,
                    height: 100,
                    left: "50%",
                    top: "50%",
                    transform: "translateY(-50%)",
                }}
            >
                <motion.div
                    id="mid"
                    layout
                    style={{
                        width: "100%",
                        height: "100%",
                        position: "relative",
                    }}
                >
                    <motion.div
                        id="box"
                        data-testid="box"
                        layout
                        style={hover() ? scaledB : scaledA}
                        onClick={() => setHover((h) => (h ? false : true))}
                        transition={{ duration: 10, ease: () => 0.5 }}
                    />
                </motion.div>
            </motion.div>
        </motion.div>
    )
}

/**
 * `?test=layout-repeat-new`
 */
function range(num: number) {
    return Array.from(Array(num).keys())
}

const sharedMotionProps = {
    layout: true,
    style: { background: "red", width: "100%", height: "100px" },
    transition: {
        duration: 0.25,
        delay: 0.3,
        ease: [0.2, 0.0, 0.83, 0.83],
        layout: { duration: 0.3, ease: [0.2, 0.0, 0.83, 0.83] },
    },
} as const

function LayoutRepeatNew() {
    const [count, setCount] = createSignal(0)

    return (
        <>
            <div style={{ height: "50px" }}>
                <button id="add" onClick={() => setCount((c) => c + 1)}>
                    Add item
                </button>
                <button id="reset" onClick={() => setCount(0)}>
                    Reset
                </button>
            </div>
            <div
                style={{
                    display: "grid",
                    "grid-template-columns":
                        "repeat(auto-fill, minmax(127px, 1fr))",
                    "grid-gap": "10px",
                    "min-height": "100px",
                    width: "500px",
                }}
            >
                <For each={range(count()).reverse()}>
                    {(i) => (
                        <motion.div id={`box-${i}`} {...sharedMotionProps}>
                            {i}
                        </motion.div>
                    )}
                </For>
            </div>
        </>
    )
}

/**
 * `?test=layout-portal`
 */
function LayoutPortal() {
    const [count, setCount] = createSignal(0)

    const size = () => (count() === 0 ? 100 : 300)

    return (
        <motion.div
            id="parent"
            layout
            style={{
                background: "red",
                width: size(),
                height: size(),
            }}
            onClick={() => setCount(count() + 1)}
            transition={{ duration: 10, ease: () => 0.5 }}
        >
            <Portal mount={document.body}>
                <motion.div
                    id="child"
                    layout
                    style={{ width: 100, height: 100, background: "blue" }}
                    transition={{ duration: 10, ease: () => 0.5 }}
                    data-framer-portal-id="parent"
                />
            </Portal>
        </motion.div>
    )
}

/**
 * `?test=layout-rerender`
 */
function LayoutRerender(props: { parent?: string }) {
    const [state, setState] = createSignal(0)
    const backgroundColor = useMotionValue("red")
    const renderCount = useMotionValue(0)

    createEffect(
        () => state(),
        (value) => {
            if (value === 1) {
                setTimeout(() => setState(2), 50)
            }
        }
    )

    const rerenderBox = {
        position: "absolute",
        top: 100,
        left: 100,
        background: "red",
    } as const

    const rerenderA = { ...rerenderBox, width: 100, height: 200 }
    const rerenderB = {
        ...rerenderBox,
        top: 100,
        left: 200,
        width: 300,
        height: 300,
    }

    return (
        <>
            <button onClick={() => setState(state() + 1)}>Update</button>
            <motion.pre id="render-count">{renderCount}</motion.pre>
            <motion.div
                layout={Boolean(props.parent || false)}
                style={{
                    position: "relative",
                    width: 500,
                    height: state() ? 500 : 400,
                }}
            >
                <motion.div
                    id="box"
                    data-testid="box"
                    layout
                    style={{
                        ...(state() ? rerenderA : rerenderB),
                        backgroundColor,
                    }}
                    transition={{ duration: 1 }}
                    onLayoutAnimationStart={() =>
                        renderCount.set(renderCount.get() + 1)
                    }
                />
            </motion.div>
        </>
    )
}

/**
 * `?test=layout-crossfade`
 */
function LayoutCrossfade() {
    const [state, setState] = createSignal(false)

    return (
        <MotionConfig transition={{ duration: 10, ease: (_p) => 0.25 }}>
            <div style={{ display: "flex", gap: "100px" }}>
                <motion.div
                    layoutId="box"
                    style={{ width: 100, height: 100, background: "red" }}
                />
                <AnimatePresence>
                    <Show when={state()}>
                        <motion.div
                            id="box"
                            layoutId="box"
                            layoutCrossfade={false}
                            style={{
                                width: 100,
                                height: 100,
                                background: "blue",
                            }}
                        />
                    </Show>
                </AnimatePresence>
            </div>
            <button onClick={() => setState(!state())}>Toggle</button>
        </MotionConfig>
    )
}

describe("Layout animation", () => {
    it("Correctly fires layout={true} animations and fires onLayoutAnimationStart and onLayoutAnimationComplete", async () => {
        await visit(Layout)
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#box"), "click")
        /**
         * Test that onLayoutAnimationStart fires
         */
        await should(() =>
            expect(query("#box").style.backgroundColor).toBe("green")
        )
        await should(() =>
            expectBbox(query("#box"), {
                top: 50,
                left: 100,
                width: 200,
                height: 250,
            })
        )
        /**
         * Test that onLayoutAnimationComplete fires
         */
        await should(() =>
            expect(query("#box").style.backgroundColor).toBe("blue")
        )
    })

    it(`It correctly fires layout="position" animations`, async () => {
        await visit(Layout, { type: "position" })
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#box"), "click")
        await should(() =>
            expectBbox(query("#box"), {
                top: 50,
                left: 100,
                width: 300,
                height: 300,
            })
        )
    })

    it(`It correctly fires layout="size" animations`, async () => {
        await visit(Layout, { type: "size" })
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#box"), "click")
        await should(() =>
            expectBbox(query("#box"), {
                top: 100,
                left: 200,
                width: 200,
                height: 250,
            })
        )
    })

    it("Doesn't initiate a new animation if the viewport box hasn't updated between renders", async () => {
        await visit(LayoutBlockInterrupt)
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#box"), "click")
        await should(() =>
            expectBbox(query("#box"), {
                top: 50,
                left: 100,
                width: 200,
                height: 250,
            })
        )
        /**
         * The easing curve is set to always return t=0.5, so if this box moves it means
         * a new animation has started
         */
        trigger(query("#box"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 50,
                left: 100,
                width: 200,
                height: 250,
            })
        )
    })

    it("Doesn't initiate a new animation if layoutDependency hasn't changed", async () => {
        await visit(LayoutDependency)
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#box"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                height: 300,
                left: 200,
                top: 100,
                width: 300,
            })
        )
        /**
         * The easing curve is set to always return t=0.5, so if this box moves it means
         * a new animation has started
         */
        trigger(query("#box"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
    })

    it("Exiting children correctly animate when layoutDependency changes", async () => {
        let initialBbox!: DOMRect

        await visit(LayoutDependencyChild)
        await wait(50)
        await should(() => {
            const child = query("#child")
            // Wait for the entry animation to start. Before its first
            // frame opacity is still 0, so exiting to opacity 0 has
            // nothing to animate and the child is removed immediately.
            expect(getComputedStyle(child).opacity).toBe("0.5")
            initialBbox = child.getBoundingClientRect()
        })
        trigger(query("button"), "click")
        await wait(100)
        await should(() => {
            const afterBbox = query("#child").getBoundingClientRect()

            /**
             * Port note: upstream compares exactly. In current Chromium the scale-corrected
             * child's box is off by ~4e-6px (e.g. left 34.999996 instead of 35), with
             * motion/react 14.0.0 too (same projection transform strings): float precision
             * of `scale(0.666667)` inside the parent's `scale(1.5)`, not a behaviour
             * difference. Firefox and WebKit are exact.
             */
            expect(afterBbox.top).toBeCloseTo(initialBbox.top, 4)
            expect(afterBbox.left).toBeCloseTo(initialBbox.left, 4)
            expect(afterBbox.width).toBeCloseTo(initialBbox.width, 4)
            expect(afterBbox.height).toBeCloseTo(initialBbox.height, 4)
        })
    })

    it("Doesn't animate shared layout components when layoutDependency hasn't changed (issue #1436)", async () => {
        await visit(LayoutSharedDependency)
        await wait(50)
        await should(() => {
            // Color should be red (no animation started)
            expect(getComputedStyle(query("#box")).backgroundColor).toBe(
                "rgb(255, 0, 0)"
            )
        })
        // Switch to section B - same layoutDependency, should NOT animate
        trigger(query("#section-b-btn"), "click")
        await wait(50)
        await should(() => {
            /**
             * After switching sections, the box should NOT animate because
             * layoutDependency (selected=0) is the same. If an animation started,
             * the color would change to green.
             */
            expect(getComputedStyle(query("#box")).backgroundColor).toBe(
                "rgb(255, 0, 0)"
            )
        })
        // Click "Jump here" to change layoutDependency - SHOULD animate
        trigger(query("#jump-1"), "click")
        await wait(50)
        await should(() => {
            /**
             * After clicking "Jump here", the layoutDependency changes from 0 to 1,
             * so the box SHOULD animate. The color changes to green when animation starts.
             */
            expect(getComputedStyle(query("#box")).backgroundColor).not.toBe(
                "rgb(255, 0, 0)"
            )
        })
    })

    it("Has a correct bounding box when a transform is applied", async () => {
        await visit(LayoutScaledChildInTransformedParent)
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                height: 100,
                left: 200,
                top: 150,
                width: 100,
            })
        )
        trigger(query("#box"), "click")
        await should(() =>
            expectBbox(query("#box"), {
                height: 100,
                left: 225,
                top: 150,
                width: 75,
            })
        )
    })

    it("Newly-entering elements animate as expected", async () => {
        await visit(LayoutRepeatNew)
        await wait(50)
        trigger(query("#add"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#box-0"), {
                top: 50,
                left: 0,
                width: 160,
                height: 100,
            })
        )
        trigger(query("#add"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#box-1"), {
                top: 50,
                left: 0,
                width: 160,
                height: 100,
            })
        )
        await should(() => {
            const bbox = query("#box-0").getBoundingClientRect()
            expect(bbox.left).not.toBe(170)
        })
        trigger(query("#reset"), "click")
        await wait(50)
        trigger(query("#add"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#box-0"), {
                top: 50,
                left: 0,
                width: 160,
                height: 100,
            })
        )
        trigger(query("#add"), "click")
        await wait(50)
        await should(() => {
            const bbox = query("#box-0").getBoundingClientRect()
            expect(bbox.left).not.toBe(170)
        })
    })

    it("Elements within portal don't perform scale correction on parents", async () => {
        await visit(LayoutPortal)
        await wait(50)
        await should(() =>
            expectBbox(query("#parent"), {
                top: 0,
                left: 0,
                width: 100,
                height: 100,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 100,
                left: 0,
                width: 100,
                height: 100,
            })
        )
        trigger(query("#parent"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#parent"), {
                top: 0,
                left: 0,
                width: 200,
                height: 200,
            })
        )
        await wait(50)
        await should(() =>
            expectBbox(query("#child"), {
                top: 200,
                left: 0,
                width: 100,
                height: 100,
            })
        )
    })

    it("A new layout animation isn't started if the target doesn't change", async () => {
        await visit(LayoutRerender)
        await wait(50)
        trigger(query("button"), "click")
        await wait(200)
        await should(() => expect(query("#render-count").textContent).toBe("1"))
    })

    it("A new layout animation isn't started if the target doesn't change, even if parent starts layout animation", async () => {
        await visit(LayoutRerender, { parent: "true" })
        await wait(50)
        trigger(query("button"), "click")
        await wait(200)
        await should(() => expect(query("#render-count").textContent).toBe("1"))
    })

    it(`It correctly fires layout="x" animations, only animating the x axis`, async () => {
        await visit(Layout, { type: "x" })
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#box"), "click")
        await should(() =>
            expectBbox(query("#box"), {
                top: 100,
                left: 100,
                width: 200,
                height: 300,
            })
        )
    })

    it(`It correctly fires layout="y" animations, only animating the y axis`, async () => {
        await visit(Layout, { type: "y" })
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#box"), "click")
        await should(() =>
            expectBbox(query("#box"), {
                top: 50,
                left: 200,
                width: 300,
                height: 250,
            })
        )
    })

    it("Disabling crossfade works as expected", async () => {
        await visit(LayoutCrossfade)
        await wait(50)
        trigger(query("button"), "click")
        await wait(200)
        await should(() => expect(query("#box").style.opacity).toBe("1"))
        trigger(query("button"), "click")
        await wait(200)
        await should(() => expect(query("#box").style.opacity).toBe("1"))
    })
})
