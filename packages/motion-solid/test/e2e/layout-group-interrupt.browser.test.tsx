/**
 * Port of upstream's `cypress/integration/layout-group-interrupt.ts` and its page,
 * `dev/react/src/tests/layout-group-interrupt.tsx`.
 */
import { createSignal, createUniqueId, Show, type Component } from "solid-js"
import { LayoutGroup, motion, MotionConfig, type Transition } from "../../src"
import {
    nextFrame,
    query,
    should,
    trigger,
    visit,
    VIEWPORT,
    wait,
} from "./utils"

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
        return await visit(App)
    } finally {
        Object.assign(VIEWPORT, previous)
    }
}

interface Measurement {
    top: number
    left: number
    offsetTop: number
}

function measure(): Measurement {
    const button = query("#button").getBoundingClientRect()
    const parent = query("#text-wrapper").getBoundingClientRect()
    return {
        top: button.top,
        left: button.left,
        offsetTop: button.top - parent.top,
    }
}

const closeTo = (actual: number, expected: number, delta: number) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(delta)

describe(`LayoutGroup inherit="id"`, () => {
    it("relative child follows its parent when a parent layout change interrupts its own layout animation", async () => {
        await visitAt(App, 500, 500)
        await wait(250)

        const initial = measure()

        trigger(query("#button"), "click")

        // Wait until #button is part-way through its own 110px animation
        await wait(0)
        await should(() => {
            const offset = measure().top - initial.top
            expect(offset).toBeGreaterThanOrEqual(20)
            expect(offset).toBeLessThanOrEqual(90)
        })

        /**
         * #text-wrapper is re-measured, #button isn't. #button should
         * neither jump by #text-wrapper's 75px layout shift nor skip the
         * rest of its own horizontal animation within #text-wrapper.
         */
        const toggleExpander = async () => {
            const before = measure()
            trigger(query("#expander"), "click")
            await nextFrame()
            const after = measure()
            expect(Math.abs(after.top - before.top)).toBeLessThan(20)
            expect(Math.abs(after.left - before.left)).toBeLessThan(10)
            closeTo(after.offsetTop, initial.offsetTop, 1)
        }

        await toggleExpander()
        await wait(500)
        await toggleExpander()
        await wait(500)
        closeTo(measure().offsetTop, initial.offsetTop, 1)
    })
})
