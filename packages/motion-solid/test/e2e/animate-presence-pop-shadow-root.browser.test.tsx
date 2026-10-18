/**
 * Port of upstream's `cypress/integration/animate-presence-pop-shadow-root.ts` and its page,
 * `dev/react/src/tests/animate-presence-pop-shadow-root.tsx`.
 */
import { render, type JSX } from "@solidjs/web"
import { createSignal, onSettled, runWithOwner, untrack } from "solid-js"
import { animate, AnimatePresence, motion, Show } from "../../src"
import { should, trigger, visit, wait, type BoundingBox } from "./utils"

const boxStyle = {
    width: "100px",
    height: "100px",
    backgroundColor: "red",
}

function AppContent(props: { root: ShadowRoot; position?: string }) {
    const [state, setState] = createSignal(true)
    const position = () => props.position || "static"
    const itemStyle = () =>
        position() === "relative"
            ? {
                  ...boxStyle,
                  position: "relative" as const,
                  top: 100,
                  left: 100,
              }
            : boxStyle

    let ref: HTMLDivElement | undefined

    onSettled(() => {
        if (!ref) return

        animate(ref, { opacity: [0, 1] }, { duration: 1 })
        animate(ref, { opacity: [1, 0.5] }, { duration: 1 })
    })

    const purpleStyle = (): JSX.CSSProperties => ({
        width: "100px",
        height: "100px",
        "background-color": "purple",
        ...(position() === "relative"
            ? { position: "relative", top: "100px", left: "100px" }
            : {}),
    })

    return (
        <section
            style={{
                position: "relative",
                display: "flex",
                "flex-direction": "column",
                padding: "100px",
            }}
            onClick={() => setState(!state())}
        >
            <AnimatePresence mode="popLayout" root={props.root}>
                <motion.div
                    id="a"
                    layout
                    transition={{ ease: () => 1 }}
                    style={{ ...itemStyle() }}
                />
                <Show when={state()}>
                    <motion.div
                        id="b"
                        animate={{
                            opacity: 1,
                            transition: { duration: 0.001 },
                        }}
                        exit={{ opacity: 0, transition: { duration: 10 } }}
                        layout
                        style={{ ...itemStyle(), backgroundColor: "green" }}
                    />
                </Show>
                <motion.div
                    id="c"
                    layout
                    transition={{ ease: () => 1 }}
                    style={{ ...itemStyle(), backgroundColor: "blue" }}
                />
            </AnimatePresence>
            <div ref={ref} style={purpleStyle()} />
        </section>
    )
}

function App(props: { position?: string }) {
    let ref: HTMLDivElement | undefined

    onSettled(() => {
        if (!ref) return

        const shadowRoot = ref.shadowRoot ?? ref.attachShadow({ mode: "open" })
        const position = untrack(() => props.position)
        let dispose: (() => void) | undefined
        let disposed = false
        /**
         * Port note: upstream's `createRoot(shadowRoot).render()` in an effect, a separate root.
         * Solid's `render` flushes, which isn't allowed inside `onSettled`, so it's deferred.
         */
        queueMicrotask(() => {
            if (disposed) return
            dispose = runWithOwner(null, () =>
                render(
                    () => <AppContent root={shadowRoot} position={position} />,
                    shadowRoot as unknown as HTMLElement
                )
            )
        })
        return () => {
            disposed = true
            dispose?.()
        }
    })

    return <div id="shadow" ref={ref}></div>
}

/**
 * `.get(selector, { includeShadowDom: true })`
 */
function queryShadow(selector: string): HTMLElement {
    const element =
        document.querySelector<HTMLElement>(selector) ??
        document
            .querySelector("#shadow")
            ?.shadowRoot?.querySelector<HTMLElement>(selector)
    if (!element) throw new Error(`No element matches "${selector}"`)
    return element
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

describe("AnimatePresence popLayout with shadowRoot", () => {
    it("correctly pops exiting elements out of the DOM", async () => {
        await visit(App)
        await wait(50)
        await should(() =>
            expectBbox(queryShadow("#b"), {
                top: 200,
                left: 100,
                width: 100,
                height: 100,
            })
        )
        await should(() =>
            expectBbox(queryShadow("#c"), {
                top: 300,
                left: 100,
                width: 100,
                height: 100,
            })
        )
        trigger(queryShadow("#c"), "click", { x: 60, y: 60, force: true })
        await wait(100)
        await should(() =>
            expectBbox(queryShadow("#b"), {
                top: 200,
                left: 100,
                width: 100,
                height: 100,
            })
        )
        await should(() =>
            expectBbox(queryShadow("#c"), {
                top: 200,
                left: 100,
                width: 100,
                height: 100,
            })
        )
        trigger(queryShadow("#c"), "click", { x: 60, y: 60, force: true })
        await wait(100)
        await should(() =>
            expectBbox(queryShadow("#b"), {
                top: 200,
                left: 100,
                width: 100,
                height: 100,
            })
        )
        await should(() =>
            expectBbox(queryShadow("#c"), {
                top: 300,
                left: 100,
                width: 100,
                height: 100,
            })
        )
    })

    it("correctly pops exiting elements out of the DOM when they already have an explicit top/left", async () => {
        await visit(App, { position: "relative" })
        await wait(50)
        await should(() =>
            expectBbox(queryShadow("#b"), {
                top: 300,
                left: 200,
                width: 100,
                height: 100,
            })
        )
        await should(() =>
            expectBbox(queryShadow("#c"), {
                top: 400,
                left: 200,
                width: 100,
                height: 100,
            })
        )
        trigger(queryShadow("#c"), "click", { x: 60, y: 60, force: true })
        await wait(100)
        await should(() =>
            expectBbox(queryShadow("#b"), {
                top: 300,
                left: 200,
                width: 100,
                height: 100,
            })
        )
        await should(() =>
            expectBbox(queryShadow("#c"), {
                top: 300,
                left: 200,
                width: 100,
                height: 100,
            })
        )
        trigger(queryShadow("#c"), "click", { x: 60, y: 60, force: true })
        await wait(100)
        await should(() =>
            expectBbox(queryShadow("#b"), {
                top: 300,
                left: 200,
                width: 100,
                height: 100,
            })
        )
        await should(() =>
            expectBbox(queryShadow("#c"), {
                top: 400,
                left: 200,
                width: 100,
                height: 100,
            })
        )
    })
})
