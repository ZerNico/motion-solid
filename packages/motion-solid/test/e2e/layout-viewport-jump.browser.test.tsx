/**
 * Port of upstream's `cypress/integration/layout-viewport-jump.ts` and its page,
 * `dev/react/src/tests/layout-viewport-jump.tsx`.
 */
import { createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"
import { page } from "vitest/browser"
import { motion } from "../../src"
import { query, should, trigger, visit, wait, type BoundingBox } from "./utils"

/**
 * Upstream's local `expectBbox` (floored, no `left`).
 */
function expectBbox(element: Element, expectedBbox: Omit<BoundingBox, "left">) {
    const bbox = element.getBoundingClientRect()
    expect(Math.floor(bbox.top)).toBe(expectedBbox.top)
    expect(Math.floor(bbox.width)).toBe(expectedBbox.width)
    expect(Math.floor(bbox.height)).toBe(expectedBbox.height)
}

/**
 * `cy.viewport(1000, 600).visit(…)`. Port note: `visit` sets Cypress' default viewport
 * (1000x660), so the viewport is changed afterwards, and the 250ms during which a `resize`
 * blocks layout animations (see `layout-resize`) is waited out, so it can't make the test pass.
 */
async function visitAt600(
    App: (props: { nested?: string }) => JSX.Element,
    props: { nested?: string } = {}
) {
    await visit(App, props)
    await page.viewport(1000, 600)
    await wait(300)
}

const scrollable = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    overflow: "scroll",
} as const

const container = {
    "margin-top": "100px",
    display: "flex",
    "justify-content": "center",
    "align-items": "flex-start",
} as const

const box = {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#ffaa00",
}

/**
 * This test is designed to run at the Cypress default of 1000x660
 * It is scripted to scroll down 100px before triggering the layout change
 */
function App(props: { nested?: string; layoutDependency?: boolean }) {
    const [state, setState] = createSignal(true)
    const nested = props.nested || false

    const content = () => (
        <div
            style={{
                ...container,
                height: state() ? "1000px" : "auto",
            }}
        >
            <motion.div
                layout
                id="box"
                style={box}
                onClick={() => setState(!state())}
                transition={{ ease: () => 0.1 }}
                {...(props.layoutDependency
                    ? { layoutDependency: state() }
                    : {})}
            />
        </div>
    )

    if (nested) {
        return (
            <motion.div layoutScroll id="scrollable" style={scrollable}>
                {content()}
            </motion.div>
        )
    }

    return content()
}

describe("Viewport jump", () => {
    it("If viewport jumps, don't trigger layout animation", async () => {
        await visitAt600(App)
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                height: 100,
                top: 100,
                width: 100,
            })
        )
        window.scrollTo(0, 100)
        await should(() =>
            expectBbox(query("#box"), {
                height: 100,
                top: 0,
                width: 100,
            })
        )
        trigger(query("#box"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                height: 100,
                top: 100,
                width: 100,
            })
        )
    })

    /**
     * This passes locally but can't get it to pass in Cypress
     */
    it("If div scroll jumps, don't trigger layout animation if provided layoutScroll prop", async () => {
        await visitAt600(App, { nested: "true" })
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                height: 100,
                top: 100,
                width: 100,
            })
        )
        query("#scrollable").scrollTo(0, 100)
        await should(() =>
            expectBbox(query("#box"), {
                height: 100,
                top: 0,
                width: 100,
            })
        )
        trigger(query("#box"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                height: 100,
                top: 100,
                width: 100,
            })
        )
    })

    /**
     * Port note: the click only changes the style of the plain container `div`, which doesn't
     * reach the `motion` box in Solid (no re-render), so no layout snapshot is taken and the
     * tests above pass without measuring anything. These variants add `layoutDependency` so
     * the box snapshots like upstream, and check that the scroll jump still doesn't animate.
     */
    it("Port: with layoutDependency, if viewport jumps, don't trigger layout animation", async () => {
        await visitAt600(App, { layoutDependency: true } as any)
        await wait(50)
        window.scrollTo(0, 100)
        await should(() =>
            expectBbox(query("#box"), { height: 100, top: 0, width: 100 })
        )
        trigger(query("#box"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), { height: 100, top: 100, width: 100 })
        )
    })

    it("Port: with layoutDependency, if div scroll jumps, don't trigger layout animation if provided layoutScroll prop", async () => {
        await visitAt600(App, { nested: "true", layoutDependency: true } as any)
        await wait(50)
        query("#scrollable").scrollTo(0, 100)
        await should(() =>
            expectBbox(query("#box"), { height: 100, top: 0, width: 100 })
        )
        trigger(query("#box"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), { height: 100, top: 100, width: 100 })
        )
    })
})
