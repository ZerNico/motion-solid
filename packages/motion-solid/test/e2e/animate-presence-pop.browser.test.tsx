/**
 * Port of upstream's `cypress/integration/animate-presence-pop.ts` and its pages,
 * `dev/react/src/tests/animate-presence-pop.tsx` and
 * `dev/react/src/tests/animate-presence-pop-layout-container.tsx`.
 */
import type { JSX } from "@solidjs/web"
import { createSignal, onSettled, type Component } from "solid-js"
import { animate, AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait, type BoundingBox } from "./utils"

const boxStyles = {
    width: "100px",
    height: "100px",
    backgroundColor: "red",
}

type Position = "static" | "relative" | "absolute" | "fixed"
type Anchor = "left" | "right"

interface PageProps {
    position?: Position
    "anchor-x"?: Anchor
}

const itemStyleOf = (position: Position = "static") =>
    position === "relative" ? { position, top: 100, left: 100 } : {}

/**
 * The page's children of `AnimatePresence` and the purple box after it, shared by both pages.
 */
function Items(props: { position?: Position; state: boolean }) {
    const itemStyle = () => itemStyleOf(props.position)

    return (
        <>
            <motion.div
                id="a"
                layout
                transition={{ ease: () => 1 }}
                style={{ ...boxStyles, ...itemStyle() }}
            />
            <Show when={props.state}>
                <motion.div
                    id="b"
                    animate={{
                        opacity: 1,
                        transition: { duration: 0.001 },
                    }}
                    exit={{ opacity: 0, transition: { duration: 10 } }}
                    layout
                    style={{
                        ...boxStyles,
                        ...itemStyle(),
                        backgroundColor: "green",
                    }}
                />
            </Show>
            <motion.div
                id="c"
                layout
                transition={{ ease: () => 1 }}
                style={{
                    ...boxStyles,
                    ...itemStyle(),
                    backgroundColor: "blue",
                }}
            />
        </>
    )
}

function PurpleBox(props: { position?: Position }) {
    let ref: HTMLDivElement | undefined

    onSettled(() => {
        if (!ref) return

        animate(ref, { opacity: [0, 1] }, { duration: 1 })
        animate(ref, { opacity: [1, 0.5] }, { duration: 1 })
    })

    const style = (): JSX.CSSProperties => {
        const itemStyle = itemStyleOf(props.position)
        return {
            width: "100px",
            height: "100px",
            "background-color": "purple",
            ...("position" in itemStyle
                ? { position: "relative", top: "100px", left: "100px" }
                : {}),
        }
    }

    return <div ref={ref} style={style()} />
}

/**
 * `animate-presence-pop.tsx`
 */
function App(props: PageProps) {
    const [state, setState] = createSignal(true)

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                "flex-direction": "column",
                padding: "100px",
            }}
            onClick={() => setState(!state())}
        >
            <AnimatePresence
                anchorX={props["anchor-x"] || "left"}
                mode="popLayout"
            >
                <Items position={props.position} state={state()} />
            </AnimatePresence>
            <PurpleBox position={props.position} />
        </div>
    )
}

/**
 * `animate-presence-pop-layout-container.tsx`
 */
function LayoutContainerApp(props: PageProps) {
    const [state, setState] = createSignal(true)

    return (
        <motion.div
            layout
            style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                padding: "80px",
                backgroundColor: "grey",
                margin: "20px",
            }}
            onClick={() => setState(!state())}
            transition={{ duration: 10 }}
        >
            <AnimatePresence
                anchorX={props["anchor-x"] || "left"}
                mode="popLayout"
            >
                <Items position={props.position} state={state()} />
            </AnimatePresence>
            <PurpleBox position={props.position} />
        </motion.div>
    )
}

/**
 * Upstream's local `expectBbox` (exact, unrounded).
 */
function expectBbox(element: HTMLElement, expectedBbox: Partial<BoundingBox>) {
    const bbox = element.getBoundingClientRect()
    expect(bbox.left).toBe(expectedBbox.left)
    expect(bbox.top).toBe(expectedBbox.top)
    expectedBbox.width && expect(bbox.width).toBe(expectedBbox.width)
    expectedBbox.height && expect(bbox.height).toBe(expectedBbox.height)
}

function runTests(Page: Component<PageProps>, layoutContainer: boolean) {
    const name =
        "AnimatePresence popLayout" +
        (layoutContainer ? " with layout animations" : "")

    describe(name, () => {
        it("correctly pops exiting elements out of the DOM", async () => {
            await visit(Page)
            await wait(50)
            await should(() =>
                expectBbox(query("#b"), {
                    top: 200,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
            await should(() =>
                expectBbox(query("#c"), {
                    top: 300,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
            trigger(query("#c"), "click", { x: 60, y: 60, force: true })
            await wait(100)
            await should(() =>
                expectBbox(query("#b"), {
                    top: 200,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
            await should(() =>
                expectBbox(query("#c"), {
                    top: 200,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
            trigger(query("#c"), "click", { x: 60, y: 60, force: true })
            await wait(100)
            await should(() =>
                expectBbox(query("#b"), {
                    top: 200,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
            await should(() =>
                expectBbox(query("#c"), {
                    top: 300,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
        })

        it("correctly pops exiting elements out of the DOM when they already have an explicit top/left", async () => {
            await visit(Page, { position: "relative" })
            await wait(50)
            await should(() =>
                expectBbox(query("#b"), {
                    top: 300,
                    left: 200,
                    width: 100,
                    height: 100,
                })
            )
            await should(() =>
                expectBbox(query("#c"), {
                    top: 400,
                    left: 200,
                    width: 100,
                    height: 100,
                })
            )
            trigger(query("#c"), "click", { x: 60, y: 60, force: true })
            await wait(100)
            await should(() =>
                expectBbox(query("#b"), {
                    top: 300,
                    left: 200,
                    width: 100,
                    height: 100,
                })
            )
            await should(() =>
                expectBbox(query("#c"), {
                    top: 300,
                    left: 200,
                    width: 100,
                    height: 100,
                })
            )
            trigger(query("#c"), "click", { x: 60, y: 60, force: true })
            await wait(100)
            await should(() =>
                expectBbox(query("#b"), {
                    top: 300,
                    left: 200,
                    width: 100,
                    height: 100,
                })
            )
            await should(() =>
                expectBbox(query("#c"), {
                    top: 400,
                    left: 200,
                    width: 100,
                    height: 100,
                })
            )
        })

        it("correctly pops exiting elements out of the DOM when anchorX is set to right", async () => {
            await visit(Page, { "anchor-x": "right" })
            await wait(50)
            await should(() =>
                expectBbox(query("#b"), {
                    top: 200,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
            await should(() =>
                expectBbox(query("#c"), {
                    top: 300,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
            trigger(query("#c"), "click", { x: 60, y: 60, force: true })
            await wait(100)
            await should(() =>
                expectBbox(query("#b"), {
                    top: 200,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
            await should(() =>
                expectBbox(query("#c"), {
                    top: 200,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
            trigger(query("#c"), "click", { x: 60, y: 60, force: true })
            await wait(100)
            await should(() =>
                expectBbox(query("#b"), {
                    top: 200,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
            await should(() =>
                expectBbox(query("#c"), {
                    top: 300,
                    left: 100,
                    width: 100,
                    height: 100,
                })
            )
        })
    })
}

runTests(App, false)
runTests(LayoutContainerApp, true)
