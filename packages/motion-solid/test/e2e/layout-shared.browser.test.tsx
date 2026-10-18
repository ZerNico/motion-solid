/**
 * Port of upstream's `cypress/integration/layout-shared.ts` and the pages it visits,
 * `dev/react/src/tests/`: `layout-shared-toggle-multiple.tsx`,
 * `layout-shared-animate-presence.tsx`, `layout-shared-switch-a-b.tsx`,
 * `layout-shared-switch-a-ab.tsx`, `layout-shared-switch-0-a-b-0.tsx`,
 * `layout-shared-crossfade-a-b-transform-template.tsx`, `layout-shared-crossfade-a-ab.tsx`,
 * `layout-preserve-ratio.tsx`, `layout-shared-instant-transition-a-ab-a.tsx`,
 * `layout-shared-crossfade-nested.tsx`, `layout-shared-crossfade-nested-display-contents.tsx`,
 * `layout-group-unmount.tsx`, `layout-group-unmount-list.tsx`,
 * `layout-shared-clear-snapshots.tsx`, `layout-follow-pointer-events.tsx`,
 * `layout-queuemicrotask.tsx`, `layout-shared-rotate.tsx` and `layout-shared-border-radius.tsx`.
 */
import { createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"
import {
    AnimatePresence,
    LayoutGroup,
    mix,
    motion,
    MotionConfig,
    Show,
    useAnimationFrame,
    useCycle,
    useInstantLayoutTransition,
    useMotionValue,
    type MotionStyle,
} from "../../src"
import { query, should, trigger, visit, wait, type BoundingBox } from "./utils"

type LayoutType = true | "position" | "size" | "preserve-aspect"

/**
 * Upstream's local `expectBbox` (not rounded).
 */
function expectBbox(element: Element, expectedBbox: BoundingBox) {
    const bbox = element.getBoundingClientRect()
    expect(bbox.left).toBe(expectedBbox.left)
    expect(bbox.top).toBe(expectedBbox.top)
    expect(bbox.width).toBe(expectedBbox.width)
    expect(bbox.height).toBe(expectedBbox.height)
}

/**
 * Cypress' `.click()` (fires the pointer and mouse events, then `click`).
 */
function click(element: Element) {
    trigger(element, "pointerdown")
    trigger(element, "mousedown")
    trigger(element, "pointerup")
    trigger(element, "mouseup")
    trigger(element, "click")
}

const absoluteBox = {
    position: "absolute",
    top: 0,
    left: 0,
    background: "red",
} as const

/**
 * `layout-shared-toggle-multiple`
 */
function ToggleMultiple() {
    const [isOpen, setIsOpen] = createSignal(false)

    return (
        <MotionConfig transition={{ duration: 1 }}>
            <button
                style={{ position: "fixed", top: 0, left: "300px" }}
                onClick={() => setIsOpen(!isOpen())}
            >
                Toggle
            </button>

            <motion.div
                layoutId="box"
                id="a"
                style={{
                    width: 100,
                    height: 100,
                    background: "red",
                    borderRadius: 20,
                }}
            />
            <Show when={isOpen()}>
                <motion.div
                    layoutId="box"
                    id="b"
                    style={{ width: 200, height: 200, background: "blue" }}
                />
            </Show>
        </MotionConfig>
    )
}

/**
 * `layout-shared-animate-presence`: an example of a component resuming animation and layout
 * state using Shared layout and layoutId
 */
const presenceAnimate = [
    { backgroundColor: "#09f", borderRadius: 10, opacity: 1 },
    { backgroundColor: "#90f", borderRadius: 100, opacity: 0.5 },
    { backgroundColor: "#f09", borderRadius: 0, opacity: 1 },
    { backgroundColor: "#9f0", borderRadius: 50, opacity: 0.5 },
]

const presenceStyles = [
    { width: 100, height: 100, top: 100 },
    { width: 200, height: 200, left: 100 },
    { width: 100, height: 100, left: "calc(100vw - 100px)" },
    { width: 200, height: 200 },
]

function PresenceComponent() {
    const [count, cycleCount] = useCycle(0, 1, 2, 3)

    // Port note: React's `key` → a keyed `Show`. An exiting child keeps the props it was
    // rendered with last, like upstream.
    return (
        <AnimatePresence>
            <Show when={`shape-${count()}`} keyed>
                {(key) => {
                    const index = Number(key.slice("shape-".length))
                    return (
                        <motion.div
                            initial={false}
                            style={{
                                position: "absolute",
                                ...presenceStyles[index],
                            }}
                            transition={{ duration: 10, ease: () => 0.25 }}
                            animate={presenceAnimate[index]}
                            layoutId="box"
                            id={key}
                            onClick={() => cycleCount()}
                        />
                    )
                }}
            </Show>
        </AnimatePresence>
    )
}

function AnimatePresencePage() {
    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "white",
                display: "flex",
                "justify-content": "center",
                "align-items": "center",
            }}
        >
            <PresenceComponent />
        </div>
    )
}

/**
 * `layout-shared-switch-a-b`
 */
const switchA = { ...absoluteBox, width: 100, height: 200 }
const switchB = {
    ...absoluteBox,
    top: 100,
    left: 200,
    width: 300,
    height: 300,
}

function SwitchAB(props: { type?: LayoutType }) {
    const type = props.type || true
    const [state, setState] = createSignal(true)
    const backgroundColor = useMotionValue("#f00")

    // Port note: React's `key` swap → a keyed `Show`.
    return (
        <Show when={state() ? "a" : "b"} keyed>
            {(key) => {
                const state = key === "a"
                return (
                    <motion.div
                        id={key}
                        data-testid="box"
                        layoutId="box"
                        layout={type}
                        style={{
                            ...(state ? switchA : switchB),
                            backgroundColor,
                            borderRadius: state ? 0 : 20,
                            opacity: state ? 0.4 : 1,
                        }}
                        onClick={() => setState(!state)}
                        transition={{ duration: 1, ease: () => 0.5 }}
                        onLayoutAnimationStart={() =>
                            backgroundColor.set("#0f0")
                        }
                        onLayoutAnimationComplete={() =>
                            backgroundColor.set("#00f")
                        }
                    />
                )
            }}
        </Show>
    )
}

/**
 * `layout-shared-switch-a-ab`
 */
function SwitchAAB(props: { type?: LayoutType }) {
    const transition = {
        default: { duration: 0.2, ease: () => 0.1 },
    }
    const type = props.type || true
    const [state, setState] = createSignal(false)

    return (
        <>
            <motion.div
                id="a"
                layoutId="box"
                layout={type}
                style={switchA}
                onClick={() => setState(!state())}
                transition={transition}
            />
            <Show when={state()}>
                <motion.div
                    id="b"
                    layoutId="box"
                    style={switchB}
                    transition={transition}
                    onClick={() => setState(!state())}
                />
            </Show>
        </>
    )
}

/**
 * `layout-shared-switch-0-a-b-0`
 */
function Switch0AB0(props: { type?: LayoutType }) {
    const transition = {
        default: { duration: 5, ease: () => 0.5 },
    }
    const type = props.type || true
    const [count, setCount] = createSignal(0)

    return (
        <div
            id="trigger"
            style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            }}
            onClick={() => setCount(count() + 1)}
        >
            <Show when={count() === 1 || count() === 3}>
                <motion.div
                    id="a"
                    layoutId="box"
                    layout={type}
                    style={switchA}
                    transition={transition}
                />
            </Show>
            <Show when={count() === 2}>
                <motion.div
                    id="b"
                    layoutId="box"
                    style={switchB}
                    transition={transition}
                />
            </Show>
        </div>
    )
}

/**
 * `layout-shared-crossfade-a-b-transform-template`
 */
function CrossfadeABTransformTemplate(props: { type?: LayoutType }) {
    const type = props.type || true
    const [state, setState] = createSignal(true)

    const box = {
        position: "absolute",
        top: "50%",
        left: "50%",
        background: "red",
    } as const
    const a = { ...box, width: 100, height: 200 }
    const b = { ...box, top: "50%", left: "50%", width: 300, height: 300 }

    // Port note: React's `key` → a keyed `Show`.
    return (
        <motion.div
            style={{
                position: "relative",
                width: 500,
                height: 500,
                backgroundColor: "blue",
            }}
        >
            <AnimatePresence>
                <Show when={state() ? "a" : "b"} keyed>
                    {(key) => {
                        const state = key === "a"
                        return (
                            <motion.div
                                id={key}
                                data-testid="box"
                                layoutId="box"
                                layout={type}
                                style={{
                                    ...(state ? a : b),
                                    backgroundColor: state ? "#f00" : "#0f0",
                                    borderRadius: state ? 0 : 20,
                                }}
                                transition={{ duration: 1, ease: () => 0.5 }}
                                onClick={() => setState(!state)}
                                transformTemplate={(_, generated) =>
                                    `translate(-50%, -50%) ${generated}`
                                }
                            />
                        )
                    }}
                </Show>
            </AnimatePresence>
        </motion.div>
    )
}

/**
 * `layout-shared-crossfade-a-ab`
 */
function CrossfadeAAB(props: {
    type?: LayoutType
    size?: string
    move?: string
}) {
    const transition = {
        default: { duration: 1, ease: () => 0.5 },
        opacity: { duration: 1, ease: () => 0.1 },
    }
    const aLarge = {
        ...absoluteBox,
        top: 100,
        left: 200,
        width: 300,
        height: 600,
    }
    const type = props.type || true
    const size = props.size || false
    const move = props.move || "yes"
    const [state, setState] = createSignal(false)

    // Port note: upstream mutates the shared style object, which is fresh on every page load.
    const bStyle: MotionStyle = { ...(size ? aLarge : switchB) }
    if (move === "no") {
        bStyle.top = bStyle.left = 0
    }

    return (
        <>
            <motion.div
                id="a"
                layoutId="box"
                layout={type}
                style={switchA}
                onClick={() => setState(!state())}
                transition={transition}
            />
            <Show when={state()}>
                <motion.div
                    id="b"
                    layoutId="box"
                    layout={type}
                    style={bStyle}
                    transition={transition}
                    onClick={() => setState(!state())}
                />
            </Show>
        </>
    )
}

/**
 * `layout-preserve-ratio`
 */
function PreserveRatio() {
    const transition = {
        default: { duration: 5 },
    }
    const [state, setState] = createSignal(false)
    // Force animation frames to pull transform
    const opacity = useMotionValue(0)
    useAnimationFrame(() => opacity.set(mix(0.99, 1, Math.random())))

    return (
        <motion.div
            layout
            style={
                state()
                    ? { width: 100, height: 200, background: "black" }
                    : { width: 200, height: 200, background: "black" }
            }
        >
            <motion.div
                id="a"
                layout="preserve-aspect"
                style={{
                    position: "absolute",
                    top: 100,
                    left: 100,
                    background: "red",
                    width: state() ? 100 : 200,
                    height: 200,
                    opacity,
                }}
                onClick={() => setState(!state())}
                transition={transition}
            />
        </motion.div>
    )
}

/**
 * `layout-shared-instant-transition-a-ab-a`
 */
function InstantTransitionAABA(props: { type?: LayoutType }) {
    const transition = {
        default: { duration: 10, ease: () => 0.5 },
        opacity: { duration: 10, ease: () => 0.1 },
    }
    const box = { position: "absolute", top: 0, left: 0 } as const
    const a = { ...box, width: 100, height: 200, borderRadius: 0 }
    const b = {
        ...box,
        top: 100,
        left: 200,
        width: 300,
        height: 300,
        borderRadius: 20,
    }

    const startTransition = useInstantLayoutTransition()
    const type = props.type || true
    const [bgColor, setBgColor] = createSignal("#f00")
    const [state, setState] = createSignal(false)

    const instantTransit = () => {
        startTransition(() => {
            setBgColor("#00f")
        })
        setState(!state())
    }

    // a -> instant -> b
    // b -> animate -> a
    return (
        <AnimatePresence>
            <motion.div
                id="a"
                data-testid="box"
                layoutId="box"
                layout={type}
                style={{ ...a, background: bgColor() }}
                onClick={instantTransit}
                transition={transition}
            />
            <Show when={state()}>
                <motion.div
                    id="b"
                    layoutId="box"
                    style={{ ...b, background: bgColor() }}
                    onClick={() => setState(!state())}
                />
            </Show>
        </AnimatePresence>
    )
}

/**
 * `layout-shared-crossfade-nested` and `layout-shared-crossfade-nested-display-contents`
 */
function CrossfadeNested(props: {
    type?: LayoutType
    displayContents?: boolean
}) {
    const transition = { duration: 10, ease: () => 0.5 }
    const a = {
        ...absoluteBox,
        width: 100,
        height: 200,
        top: 100,
        left: 200,
    }
    const b = {
        ...absoluteBox,
        top: 300,
        left: 200,
        width: 300,
        height: 300,
    }
    const childA = { width: 100, height: 100, background: "blue" }
    const childB = { width: 100, height: 100, background: "blue" }

    const type = props.type || true
    const [state, setState] = createSignal(true)

    // Port note: React's `key` → a keyed `Show`.
    return (
        <AnimatePresence>
            <Show when={state() ? "a" : "b"} keyed>
                {(key) => {
                    const state = key === "a"
                    const child = () => (
                        <motion.div
                            id="child"
                            layoutId="child"
                            transition={transition}
                            style={state ? childA : childB}
                        />
                    )
                    return (
                        <motion.div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: 500,
                                height: 400,
                            }}
                        >
                            <motion.div
                                id={key}
                                data-testid="box"
                                layoutId="box"
                                layout={type}
                                style={{
                                    ...(state ? a : b),
                                    backgroundColor: state ? "#f00" : "#0f0",
                                    borderRadius: state ? 0 : 20,
                                }}
                                transition={transition}
                                onClick={() => setState(!state)}
                            >
                                {props.displayContents ? (
                                    <motion.div
                                        id="mid"
                                        layoutId="mid"
                                        style={{ display: "contents" }}
                                        transition={transition}
                                    >
                                        {child()}
                                    </motion.div>
                                ) : (
                                    child()
                                )}
                            </motion.div>
                        </motion.div>
                    )
                }}
            </Show>
        </AnimatePresence>
    )
}

/**
 * `layout-group-unmount`
 */
const unmountStyle = {
    width: 100,
    height: 100,
    background: "red",
    opacity: 1,
    borderRadius: 20,
    margin: 20,
}

function GroupUnmountItem() {
    const [variant, setVariant] = createSignal("a")
    const isVisible = () => variant() === "a"
    return (
        <LayoutGroup id="group-2">
            <motion.div style={{ display: "contents" }}>
                <Show when={isVisible()}>
                    <motion.div
                        id="a"
                        layoutId="a"
                        style={unmountStyle}
                        onClick={() =>
                            setVariant(variant() === "a" ? "b" : "a")
                        }
                    />
                </Show>
            </motion.div>
        </LayoutGroup>
    )
}

function GroupUnmount() {
    return (
        <LayoutGroup id="group-1">
            <motion.div style={{ display: "contents" }}>
                <motion.div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "start",
                    }}
                >
                    <GroupUnmountItem />
                </motion.div>
                <motion.div
                    layoutId="b"
                    style={{ ...unmountStyle, backgroundColor: "blue" }}
                    id="b"
                    transition={{ duration: 0.2, ease: () => 0.5 }}
                />
            </motion.div>
        </LayoutGroup>
    )
}

/**
 * `layout-group-unmount-list`
 */
function GroupUnmountListItem(props: { id: string; backgroundColor: string }) {
    const style = {
        width: 100,
        height: 100,
        opacity: 1,
        borderRadius: 20,
        margin: 20,
    }
    const [visible, setVisible] = createSignal(true)
    const isVisible = () => !!visible()
    return (
        <LayoutGroup id="group-2">
            <motion.div style={{ display: "contents" }}>
                <Show when={isVisible()}>
                    <motion.div
                        id={props.id}
                        layoutId={props.id}
                        style={{
                            ...style,
                            backgroundColor: props.backgroundColor,
                        }}
                        onClick={() => setVisible(false)}
                        transition={{ duration: 10, ease: () => 0.5 }}
                    />
                </Show>
            </motion.div>
        </LayoutGroup>
    )
}

function GroupUnmountListList(props: { children?: JSX.Element }) {
    const containerStyle = {
        display: "block",
        width: "min-content",
        height: "min-content",
    }
    const stackStyle = {
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        padding: 20,
        width: "auto",
        height: "auto",

        backgroundColor: "blue",
    } as const
    return (
        <LayoutGroup id="list">
            <motion.div style={{ display: "contents" }}>
                <motion.div
                    id="stack"
                    layoutId="stack"
                    // Port note: upstream passes `{ containerStyle }` (a no-op style key).
                    style={{ containerStyle } as any}
                    transition={{ duration: 0.2, ease: () => 0.5 }}
                >
                    <motion.div style={stackStyle}>
                        <motion.div style={{ display: "contents" }}>
                            {props.children}
                        </motion.div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </LayoutGroup>
    )
}

function GroupUnmountList() {
    return (
        <LayoutGroup id="group-1">
            <motion.div
                style={{ position: "absolute", left: 100, bottom: 100 }}
            >
                <GroupUnmountListList>
                    <GroupUnmountListItem id="a" backgroundColor="red" />
                    <GroupUnmountListItem id="b" backgroundColor="yellow" />
                </GroupUnmountListList>
            </motion.div>
        </LayoutGroup>
    )
}

/**
 * `layout-shared-clear-snapshots`
 */
function ClearSnapshots(props: { sibling?: string }) {
    const box = {
        position: "absolute",
        top: 100,
        left: 0,
        width: 100,
        height: 100,
        background: "red",
    } as const
    const a = { ...box }
    const b = { ...box, left: 200 }

    const sibling = props.sibling || false
    const [state, cycle] = useCycle(0, 1, 2)

    return (
        <>
            <button id="next" onClick={() => cycle()}>
                Next
            </button>
            <Show when={state() !== 1}>
                <motion.div
                    id="box"
                    layout
                    layoutId="box"
                    style={{ ...(state() === 0 ? a : b) }}
                    transition={{
                        duration: 0.15,
                        // ease: state === 2 ? () => 0.5 : undefined,
                    }}
                />
            </Show>
            {/**
             * Test this twice, once with a sibling and once without. With a sibling,
             * didUpdate should fire as normal. Without a sibling, didUpdate won't fire as
             * the removed element is the only projecting element in the tree (so no lifecycle
             * methods can fire it) so the checkUpdateFailed will flag on the next frame
             * and cancel the update
             */}
            <Show when={sibling && state() !== 2}>
                <motion.div
                    layout
                    style={{ ...box, backgroundColor: "blue", top: 200 }}
                />
            </Show>
        </>
    )
}

/**
 * `layout-follow-pointer-events`
 */
function FollowPointerEvents() {
    const [isOpen, setIsOpen] = createSignal(false)

    return (
        <MotionConfig transition={{ duration: 0.1 }}>
            <motion.div
                id="a"
                layoutId="box"
                style={{ background: "red", width: 100, height: 200 }}
                onClick={() => setIsOpen(true)}
            />
            <Show when={isOpen()}>
                <motion.div
                    id="b"
                    layoutId="box"
                    style={{
                        width: 300,
                        height: 300,
                        background: "blue",
                        borderRadius: 20,
                    }}
                    onClick={() => setIsOpen(false)}
                />
            </Show>
        </MotionConfig>
    )
}

/**
 * `layout-queuemicrotask`
 */
function QueueMicrotask() {
    const [isOpen, setIsOpen] = createSignal(false)
    const [error, setError] = createSignal("")

    return (
        <div style={{ position: "relative" }}>
            <AnimatePresence mode="wait">
                <Show when={isOpen()}>
                    <motion.div
                        layoutId={"1"}
                        id="open"
                        style={{
                            height: "400px",
                            width: "400px",
                            backgroundColor: "red",
                            position: "absolute",
                            top: "200px",
                            left: "200px",
                        }}
                        transition={{ duration: 0.1 }}
                        onLayoutMeasure={(layout) => {
                            if (layout.x.min !== 200) {
                                setError("Layout measured incorrectly")
                            }
                        }}
                        onClick={() => setIsOpen(false)}
                    ></motion.div>
                </Show>
            </AnimatePresence>
            <motion.div
                id="target"
                layoutId="1"
                style={{
                    height: "200px",
                    width: "200px",
                    backgroundColor: "blue",
                }}
                transition={{ duration: 0.1 }}
                onClick={() => {
                    setIsOpen(true)
                }}
            />
            <div id="error" style={{ color: "red" }}>
                {error()}
            </div>
        </div>
    )
}

/**
 * `layout-shared-rotate`
 */
function Rotate() {
    const [state, setState] = createSignal(false)

    // Port note: React's `key` swap → a keyed `Show`.
    return (
        <Show when={state() ? "a" : "b"} keyed>
            {(key) => {
                const state = key === "a"
                const size = state ? 100 : 200
                return (
                    <motion.div
                        id="box"
                        data-testid="box"
                        layoutId="box"
                        style={{
                            rotate: 45,
                            width: size,
                            height: size,
                            backgroundColor: "red",
                        }}
                        onClick={() => setState(!state)}
                        transition={{
                            duration: 10,
                            ease: state ? () => 0.5 : () => 0,
                        }}
                    />
                )
            }}
        </Show>
    )
}

/**
 * `layout-shared-border-radius`
 */
const borderRadiusTransition = {
    // ease: () => 0.5,
    duration: 10,
}
const brBox = { background: "red", gridArea: "1 / 1" }
const brContainer = {
    display: "flex",
    "justify-content": "center",
    "align-items": "center",
    gap: "20px",
    width: "300px",
    height: "300px",
} as const
const brA = { ...brBox, width: 80, height: 80 }
const brB = { ...brBox, left: 200, width: 140, height: 140 }

function BoxA(props: { isOpen: boolean }) {
    return (
        <div style={brContainer}>
            <motion.div
                style={{ ...brA, borderRadius: 24 }}
                transition={borderRadiusTransition}
                layoutId="boxA"
            />
            <Show when={props.isOpen}>
                <motion.div
                    class="measure-box"
                    style={{ ...brB, borderRadius: 0 }}
                    transition={borderRadiusTransition}
                    layoutId="boxA"
                />
            </Show>
        </div>
    )
}

function BoxB(props: { isOpen: boolean }) {
    return (
        <div style={brContainer}>
            <Show
                when={props.isOpen}
                fallback={
                    <motion.div
                        style={{ ...brA, borderRadius: 24 }}
                        transition={borderRadiusTransition}
                        layoutId="boxB"
                    />
                }
            >
                <motion.div
                    class="measure-box"
                    style={{ ...brB, borderRadius: 0 }}
                    transition={borderRadiusTransition}
                    layoutId="boxB"
                />
            </Show>
        </div>
    )
}

function BorderRadius() {
    const [isOpen, setOpen] = createSignal(false)

    return (
        <MotionConfig transition={{ duration: 1 }}>
            <button id="next" onClick={() => setOpen(!isOpen())}>
                Next
            </button>
            <BoxA isOpen={isOpen()} />
            <BoxB isOpen={isOpen()} />
        </MotionConfig>
    )
}

/**
 * Port note: `#a` and `#b` are both laid out at `left: 0`, so their projected boxes animate
 * between `x.min` 0 and 0: upstream's `left !== 0` only passes thanks to floating point noise
 * in the projection transform (e.g. `-0.0000076` in Chromium, `-8e-9` in WebKit). Firefox
 * computes exactly `0` (the crossfade is running: `#b` is ~131px wide 200ms in), so the
 * faithful assertion fails there.
 */
const isFirefox = navigator.userAgent.includes("Firefox")

describe("Shared layout: Toggle multiple times", () => {
    ;(isFirefox ? it.fails : it)("Should allow multiple toggles", async () => {
        const expectNotAtZero = (selector: string) =>
            should(() => {
                const bbox = query(selector).getBoundingClientRect()
                expect(bbox.left).not.toBe(0)
            })

        await visit(ToggleMultiple)
        await wait(50)
        click(query("button"))
        await wait(200)
        await expectNotAtZero("#a")
        await expectNotAtZero("#b")
        click(query("button"))
        await wait(200)
        await expectNotAtZero("#a")
        click(query("button"))
        await wait(200)
        await expectNotAtZero("#a")
        await expectNotAtZero("#b")
        click(query("button"))
        await wait(200)
        await expectNotAtZero("#a")
    })
})

describe("Shared layout: A -> B transition", () => {
    it("When performing crossfade animation, removed element isn't removed until animation is complete", async () => {
        await visit(AnimatePresencePage)
        await wait(50)
        await should(() => expect(query("#shape-0").style.opacity).toBe("1"))
        trigger(query("#shape-0"), "click")
        await wait(50)
        // Lose reference to original element
        query("#shape-1")
        await should(() => expect(query("#shape-0").style.opacity).toBe("1"))
        await should(() =>
            expect(query("#shape-1").style.opacity).toBe("0.433013")
        )
    })
})

async function switchABTrue() {
    await visit(SwitchAB)
    await wait(50)
    await should(() => {
        const $box = query("#a")
        expectBbox($box, {
            top: 0,
            left: 0,
            width: 100,
            height: 200,
        })
        expect(getComputedStyle($box).opacity).toBe("0.4")
    })
    trigger(query("#a"), "click")
    await wait(200)
    /**
     * Test that onLayoutAnimationStart fires
     */
    await should(() => {
        const $box = query("#b")
        expect($box.style.backgroundColor).toBe("rgb(0, 255, 0)")
        expect(window.getComputedStyle($box).borderRadius).toBe("5% / 4%")
        expect(getComputedStyle($box).opacity).toBe("0.7")
        expectBbox($box, {
            top: 50,
            left: 100,
            width: 200,
            height: 250,
        })
    })
    /**
     * Test that onLayoutAnimationComplete fires
     */
    await wait(2000)
    await should(() =>
        expect(query("#b").style.backgroundColor).toBe("rgb(0, 0, 255)")
    )
    trigger(query("#b"), "click")
    await wait(200)
    await should(() =>
        expectBbox(query("#a"), {
            top: 50,
            left: 100,
            width: 200,
            height: 250,
        })
    )
}

async function switchABCrossfadeTrue() {
    await visit(SwitchAB)
    await wait(50)
    await should(() =>
        expectBbox(query("#a"), {
            top: 0,
            left: 0,
            width: 100,
            height: 200,
        })
    )
    trigger(query("#a"), "click")
    await wait(200)
    await should(() => {
        const $box = query("#b")
        expect($box.style.backgroundColor).toBe("rgb(0, 255, 0)")
        expect(window.getComputedStyle($box).borderRadius).toBe("5% / 4%")
        expectBbox($box, {
            top: 50,
            left: 100,
            width: 200,
            height: 250,
        })
    })
    /**
     * Test that onLayoutAnimationComplete fires
     */
    await wait(2000)
    await should(() =>
        expect(query("#b").style.backgroundColor).toBe("rgb(0, 0, 255)")
    )
    trigger(query("#b"), "click")
    await wait(200)
    await should(() =>
        expectBbox(query("#a"), {
            top: 50,
            left: 100,
            width: 200,
            height: 250,
        })
    )
}

async function switchABPosition() {
    await visit(SwitchAB, { type: "position" })
    await wait(50)
    await should(() =>
        expectBbox(query("#a"), {
            top: 0,
            left: 0,
            width: 100,
            height: 200,
        })
    )
    trigger(query("#a"), "click")
    await wait(50)
    await should(() =>
        expectBbox(query("#b"), {
            top: 50,
            left: 100,
            width: 300,
            height: 300,
        })
    )
    trigger(query("#b"), "click")
    await wait(50)
    await should(() =>
        expectBbox(query("#a"), {
            top: 25,
            left: 50,
            width: 100,
            height: 200,
        })
    )
}

async function switchABSize() {
    await visit(SwitchAB, { type: "size" })
    await wait(50)
    await should(() =>
        expectBbox(query("#a"), {
            top: 0,
            left: 0,
            width: 100,
            height: 200,
        })
    )
    trigger(query("#a"), "click")
    await wait(50)
    await should(() =>
        expectBbox(query("#b"), {
            top: 100,
            left: 200,
            width: 200,
            height: 250,
        })
    )
    trigger(query("#b"), "click")
    await wait(50)
    await should(() =>
        expectBbox(query("#a"), {
            top: 0,
            left: 0,
            width: 150,
            height: 225,
        })
    )
}

describe("Shared layout: A -> B transition", () => {
    it("Correctly fires layout={true} animations and fires onLayoutAnimationStart and onLayoutAnimationComplete", async () => {
        await switchABTrue()
    })

    it(`It correctly fires layout="position" animations`, async () => {
        await switchABPosition()
    })

    it(`It correctly fires layout="size" animations`, async () => {
        await switchABSize()
    })
})

describe("Shared layout: A -> AB -> A switch transition", () => {
    it.skip("Correctly fires layout={true} animations and fires onLayoutAnimationComplete", async () => {
        await visit(SwitchAAB)
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#a"), "click")
        await wait(50)
        await should(() => expect(query("#a").style.visibility).toBe("hidden"))
        await should(() => {
            const $box = query("#b")
            expect(parseFloat($box.style.opacity)).toBe(1)
            expectBbox($box, {
                top: 50,
                left: 100,
                width: 200,
                height: 250,
            })
        })
        trigger(query("#b"), "click")
        await wait(50)
        await should(() => {
            const $box = query("#a")
            expect($box.style.visibility).not.toBe("hidden")
            expectBbox($box, {
                top: 25,
                left: 50,
                width: 100,
                height: 125,
            })
        })
    })

    it.skip(`It correctly fires layout="position" animations`, async () => {
        await visit(SwitchAAB, { type: "position" })
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#a"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#b"), {
                top: 50,
                left: 100,
                width: 300,
                height: 300,
            })
        )
        trigger(query("#b"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 50,
                left: 100,
                width: 100,
                height: 200,
            })
        )
    })
})

/**
 * Upstream's `0 -> A -> B -> 0` scripts. With `lastClickOnTrigger: false` (the last variant), the
 * last click is on `#b` (it bubbles to `#trigger`) instead of `#trigger`.
 */
async function switch0AB0(lastClickOnTrigger = true) {
    await visit(Switch0AB0)
    await wait(50)
    trigger(query("#trigger"), "click")
    await wait(50)
    await should(() =>
        expectBbox(query("#a"), {
            top: 0,
            left: 0,
            width: 100,
            height: 200,
        })
    )
    trigger(query("#trigger"), "click")
    await wait(50)
    await should(() =>
        expectBbox(query("#b"), {
            top: 50,
            left: 100,
            width: 200,
            height: 250,
        })
    )
    trigger(query(lastClickOnTrigger ? "#trigger" : "#b"), "click")
    await wait(50)
    await should(() =>
        expectBbox(query("#a"), {
            top: 25,
            left: 50,
            width: 150,
            height: 225,
        })
    )
}

describe("Shared layout: 0 -> A -> B -> 0 transition", () => {
    it("Correctly fires layout={true} animations", async () => {
        await switch0AB0()
    })
})

describe("Shared layout: 0 -> A -> AB -> A -> 0 transition", () => {
    it("Correctly fires layout={true} animations", async () => {
        await switch0AB0()
    })
})

describe("Shared layout: A -> B crossfade transition", () => {
    it("Correctly fires layout={true} animations and fires onLayoutAnimationStart and onLayoutAnimationComplete", async () => {
        await switchABCrossfadeTrue()
    })

    it(`It correctly fires layout="position" animations`, async () => {
        await switchABPosition()
    })

    it(`It correctly fires layout="size" animations`, async () => {
        await switchABSize()
    })

    it("It correctly fires layout={true} animations when the component has a transformTemplate", async () => {
        await visit(CrossfadeABTransformTemplate)
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 150,
                left: 200,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#a"), "click")
        await wait(100)
        await should(() =>
            expectBbox(query("#b"), {
                top: 125,
                left: 150,
                width: 200,
                height: 250,
            })
        )
        // interrupt the animation
        trigger(query("#b"), "click")
        await wait(100)
        await should(() =>
            expectBbox(query("#a"), {
                top: 137.5,
                left: 175,
                width: 150,
                height: 225,
            })
        )
    })
})

describe("Shared layout: A -> AB -> A crossfade transition", () => {
    it("Correctly fires layout={true} animations and fires onLayoutAnimationComplete", async () => {
        await visit(CrossfadeAAB)
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#a"), "click")
        await wait(50)
        await should(() => {
            const $box = query("#a")
            expect(parseFloat($box.style.opacity) || 1).toBe(1)
            expectBbox($box, {
                top: 50,
                left: 100,
                width: 200,
                height: 250,
            })
        })
        await should(() => {
            const $box = query("#b")
            expect(parseFloat($box.style.opacity) || 1).toBe(1)
            expectBbox($box, {
                top: 50,
                left: 100,
                width: 200,
                height: 250,
            })
        })
    })

    it(`It correctly fires layout="position" animations`, async () => {
        await visit(CrossfadeAAB, { type: "position" })
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#a"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 50,
                left: 100,
                width: 100,
                height: 200,
            })
        )
        await should(() =>
            expectBbox(query("#b"), {
                top: 50,
                left: 100,
                width: 300,
                height: 300,
            })
        )
    })

    it(`It correctly animates layout="preserve-aspect" as "position" animations if aspect ratios are different`, async () => {
        await visit(CrossfadeAAB, { type: "preserve-aspect" })
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#a"), "click")
        await wait(50)
        await should(() => {
            const $box = query("#a")
            expect(parseFloat($box.style.opacity) || 1).toBe(1)
            expectBbox($box, {
                top: 50,
                left: 100,
                width: 100,
                height: 200,
            })
        })
        await should(() => {
            const $box = query("#b")
            expect(parseFloat($box.style.opacity) || 1).toBe(1)
            expectBbox($box, {
                top: 50,
                left: 100,
                width: 300,
                height: 300,
            })
        })
    })

    it(`It correctly doesn't animate if layout="preserve-aspect" if size is different and position is the same`, async () => {
        await visit(CrossfadeAAB, { type: "preserve-aspect", move: "no" })
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#a"), "click")
        await wait(50)
        await should(() => {
            const $box = query("#a")
            expect(parseFloat($box.style.opacity) || 1).toBe(1)
            expectBbox($box, {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        })
        await should(() => {
            const $box = query("#b")
            expect(parseFloat($box.style.opacity) || 1).toBe(1)
            expectBbox($box, {
                top: 0,
                left: 0,
                width: 300,
                height: 300,
            })
        })
    })

    it(`It correctly doesn't animate if layout="preserve-aspect" on same element if size and position are the same`, async () => {
        const width = () =>
            Math.round(query("#a").getBoundingClientRect().width)

        await visit(PreserveRatio)
        await wait(50)
        await should(() => expect(width()).toBe(200))
        trigger(query("#a"), "click")
        await wait(50)
        await should(() => expect(width()).toBe(100))
        trigger(query("#a"), "click")
        await wait(50)
        await should(() => expect(width()).toBe(200))
        trigger(query("#a"), "click")
        await wait(50)
        await should(() => expect(width()).toBe(100))
    })

    it(`It correctly animates layout="preserve-aspect" as normal layout animations if both aspect ratios are the same`, async () => {
        await visit(CrossfadeAAB, { type: "preserve-aspect", size: "same" })
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#a"), "click")
        await wait(100)
        await should(() =>
            expectBbox(query("#a"), {
                top: 50,
                left: 100,
                width: 200,
                height: 400,
            })
        )
        await should(() =>
            expectBbox(query("#b"), {
                top: 50,
                left: 100,
                width: 200,
                height: 400,
            })
        )
    })

    it("Correctly fires layout={true} animations after an instant transition", async () => {
        await visit(InstantTransitionAABA)
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        trigger(query("#a"), "click")
        await wait(50)
        // a shouldn't change since the update is blocked
        await should(() => {
            const $box = query("#a")
            expect(parseFloat($box.style.opacity) || 1).toBe(1)
            expectBbox($box, {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        })
        // b should have its identical layout
        await should(() => {
            const $box = query("#b")
            expect(parseFloat($box.style.opacity) || 1).toBe(1)
            expectBbox($box, {
                top: 100,
                left: 200,
                width: 300,
                height: 300,
            })
        })
        trigger(query("#b"), "click")
        await wait(50)
        // half way back to a
        await should(() => {
            const $box = query("#a")
            expect(parseFloat($box.style.opacity) || 1).toBe(1)
            expectBbox($box, {
                top: 50,
                left: 100,
                width: 200,
                height: 250,
            })
        })
    })
})

describe("Shared layout: 0 -> A -> B -> 0 crossfade transition", () => {
    it("Correctly fires layout={true} animations", async () => {
        await switch0AB0()
    })
})

describe("Shared layout:  0 -> A -> AB -> A -> 0 crossfade transition", () => {
    it("Correctly fires layout={true} animations", async () => {
        // Upstream's last `.trigger("click")` is chained on `#b`.
        await switch0AB0(false)
    })
})

describe("Shared layout: nested crossfade transition", () => {
    it("Correctly fires layout={true} animations", async () => {
        await visit(CrossfadeNested)
        await wait(50)
        trigger(query("#a"), "click")
        await should(() =>
            expectBbox(query("#a"), {
                top: 200,
                left: 200,
                width: 200,
                height: 250,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 200,
                left: 200,
                width: 100,
                height: 100,
            })
        )
        trigger(query("#b"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#b"), {
                top: 150,
                left: 200,
                width: 150,
                height: 225,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 150,
                left: 200,
                width: 100,
                height: 100,
            })
        )
    })

    it("Correctly fires layout={true} animations when there are divs with `display: contents` in the path", async () => {
        await visit(CrossfadeNested, { displayContents: true })
        await wait(50)
        trigger(query("#a"), "click")
        await wait(250)
        await should(() =>
            expectBbox(query("#a"), {
                top: 200,
                left: 200,
                width: 200,
                height: 250,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 200,
                left: 200,
                width: 100,
                height: 100,
            })
        )
        trigger(query("#b"), "click")
        await should(() =>
            expectBbox(query("#b"), {
                top: 150,
                left: 200,
                width: 150,
                height: 225,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 150,
                left: 200,
                width: 100,
                height: 100,
            })
        )
    })
})

describe("Shared layout: component unmounts in a LayoutGroup", () => {
    it("Should trigger sibling animation when unmount", async () => {
        await visit(GroupUnmount)
        await wait(50)
        trigger(query("#a"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#b"), {
                top: 90,
                left: 20,
                width: 100,
                height: 100,
            })
        )
    })

    it("If a sibling's position relative to the parent has changed, it should remain at its position", async () => {
        await visit(GroupUnmountList)
        await wait(50)
        const bbox = query("#b").getBoundingClientRect()
        trigger(query("#a"), "click")
        await wait(50)
        await should(() => expectBbox(query("#b"), bbox))
    })
})

describe("Shared layout: A -> undefined -> B transition", () => {
    it("After removing an element with a layoutId, the next element with that ID should not animate from the last element", async () => {
        await visit(ClearSnapshots)
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 100,
                left: 0,
                width: 100,
                height: 100,
            })
        )
        click(query("button"))
        await wait(50)
        click(query("button"))
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 100,
                left: 200,
                width: 100,
                height: 100,
            })
        )
    })

    it("As previous, but with rendering layout projecting sibling that is not removed", async () => {
        await visit(ClearSnapshots, { sibling: "true" })
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 100,
                left: 0,
                width: 100,
                height: 100,
            })
        )
        click(query("button"))
        await wait(50)
        click(query("button"))
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 100,
                left: 200,
                width: 100,
                height: 100,
            })
        )
    })
})

describe("Shared pointer events", () => {
    it("Applies pointer-events: none to follow elements", async () => {
        await visit(FollowPointerEvents)
        await wait(50)
        await should(() =>
            expectBbox(query("#a"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
        click(query("#a"))
        await wait(200)
        await should(() =>
            expectBbox(query("#a"), {
                top: 200,
                left: 0,
                width: 300,
                height: 300,
            })
        )
        await should(() =>
            expectBbox(query("#b"), {
                top: 200,
                left: 0,
                width: 300,
                height: 300,
            })
        )
        click(query("#b"))
        await wait(200)
        await should(() =>
            expectBbox(query("#a"), {
                top: 0,
                left: 0,
                width: 100,
                height: 200,
            })
        )
    })
})

describe("Shared layout: Works with queueMicrotasks", () => {
    it("queueMicrotasks doesn't break layout measurements", async () => {
        await visit(QueueMicrotask)
        await wait(50)
        trigger(query("#target"), "click")
        await wait(150)
        trigger(query("#open"), "click")
        await wait(150)
        trigger(query("#target"), "click")
        await wait(150)
        trigger(query("#open"), "click")
        await wait(150)
        await should(() => expect(query("#error").innerText).toBe(""))
    })
})

describe("Shared layout: Measures rotated elements correctly when animation is interrupted", () => {
    it("Measures correctly", async () => {
        let boundingBox!: BoundingBox
        await visit(Rotate)
        await wait(50)
        trigger(query("#box"), "click")
        await should(() => {
            boundingBox = query("#box").getBoundingClientRect()
            // Only record once the animation is running, frozen halfway
            // between the 200px and 100px rotated boxes.
            // chai's `closeTo(expected, 1)`
            expect(
                Math.abs(boundingBox.width - 150 * Math.SQRT2)
            ).toBeLessThanOrEqual(1)
        })
        trigger(query("#box"), "click")
        await wait(50)
        await should(() => expectBbox(query("#box"), boundingBox))
    })
})

describe("Shared layout: Border radius", () => {
    it("Should animate border radius", async () => {
        await visit(BorderRadius)
        await wait(50)
        click(query("#next"))
        await wait(200)
        await should(() => {
            const [$boxA, $boxB] = Array.from(
                document.querySelectorAll(".measure-box")
            )
            const boxAStyle = window.getComputedStyle($boxA)
            const boxBStyle = window.getComputedStyle($boxB)
            expect(boxAStyle.borderRadius).not.toBe("0%")
            expect(boxBStyle.borderRadius).not.toBe("0%")
            expect(boxBStyle.borderRadius).toBe(boxAStyle.borderRadius)
        })
    })
})
