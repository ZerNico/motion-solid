/**
 * Port of upstream's `cypress/integration/layout-group-interrupt-measurements.ts` and its page,
 * `dev/react/src/tests/layout-group-interrupt.tsx` .
 */
import { createSignal, createUniqueId, Show, type Component } from "solid-js"
import { LayoutGroup, motion, MotionConfig, type Transition } from "../../src"
import { visit as visitPage, VIEWPORT, wait } from "./utils"

/**
 * #button is in its own LayoutGroup, so toggling #expander re-measures
 * #text-wrapper but not #button, which must follow its parent via its
 * relative target. Clicking #button also moves it right within
 * #text-wrapper, so its own animation has a relative component.
 */
const transition: Transition = {
    layout: { type: "tween", ease: "linear", duration: 10 },
}

function App() {
    const [visible, setVisible] = createSignal(false)

    return (
        <div
            style={{
                display: "flex",
                "flex-direction": "column",
                gap: "10px",
                "align-items": "center",
            }}
        >
            <Show when={visible()}>
                <div
                    style={{
                        background: "green",
                        width: "100px",
                        height: "100px",
                    }}
                />
            </Show>
            <LayoutGroup>
                <MotionConfig transition={transition}>
                    <motion.div layout="position">
                        <Expander />
                    </motion.div>
                    <motion.div
                        id="text-wrapper"
                        layout="position"
                        style={{ display: "flex", gap: 4 }}
                    >
                        {visible() ? "some longer text" : "some text"}
                        <LayoutGroup inherit="id">
                            <Button onClick={() => setVisible(!visible())} />
                        </LayoutGroup>
                    </motion.div>
                </MotionConfig>
            </LayoutGroup>
        </div>
    )
}

function Expander() {
    const [expanded, setExpanded] = createSignal(false)

    return (
        <motion.div
            id="expander"
            layoutId={createUniqueId()}
            onClick={() => setExpanded(!expanded())}
            style={{
                width: 100,
                height: expanded() ? 100 : 25,
                background: "red",
            }}
        />
    )
}

function Button(props: { onClick: VoidFunction }) {
    return (
        <motion.div
            id="button"
            layoutId={createUniqueId()}
            onClick={() => props.onClick()}
            style={{ background: "blue", padding: 10 }}
        >
            Add child
        </motion.div>
    )
}

/**
 * `cy.viewport(width, height).visit(…)`
 */
async function visitAt(App: Component, width: number, height: number) {
    const previous = { ...VIEWPORT }
    Object.assign(VIEWPORT, { width, height })
    try {
        return await visitPage(App)
    } finally {
        Object.assign(VIEWPORT, previous)
    }
}

/**
 * Counts getBoundingClientRect reads of #button when toggling #expander
 * re-measures #text-wrapper. #button is in its own LayoutGroup, so it should
 * only be re-measured while it's layout animating.
 *
 * Clicks are dispatched natively so Cypress actionability checks don't add
 * reads.
 */
let reads: Record<string, number> = {}
const getBoundingClientRect = Element.prototype.getBoundingClientRect

afterEach(() => {
    Element.prototype.getBoundingClientRect = getBoundingClientRect
})

async function visit() {
    reads = {}
    Element.prototype.getBoundingClientRect = function (this: Element) {
        if (this.id) reads[this.id] = (reads[this.id] || 0) + 1
        return getBoundingClientRect.call(this)
    }
    await visitAt(App, 500, 500)
    await wait(250)
}

async function click(id: string) {
    reads = {}
    ;(document.getElementById(id) as HTMLElement).click()
    await wait(300)
}

function expectReads(id: string, count: number) {
    expect(reads[id] || 0).toBe(count)
}

function expectMeasured(id: string) {
    expect(reads[id] || 0).toBeGreaterThan(0)
}

describe(`LayoutGroup inherit="id" measurements`, () => {
    it("doesn't re-measure a relative child that isn't animating", async () => {
        await visit()
        await click("expander")
        expectMeasured("text-wrapper")
        expectReads("button", 0)
        await click("expander")
        expectMeasured("text-wrapper")
        expectReads("button", 0)
    })

    it("re-measures a layout-animating relative child once per parent re-layout", async () => {
        await visit()
        // Starts #button's 10s layout animation
        await click("button")
        await click("expander")
        expectMeasured("text-wrapper")
        expectReads("button", 1)
        await click("expander")
        expectMeasured("text-wrapper")
        expectReads("button", 1)
    })
})
