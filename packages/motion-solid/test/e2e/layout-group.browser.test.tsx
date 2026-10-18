/**
 * Port of upstream's `cypress/integration/layout-group.ts` and its page,
 * `dev/react/src/tests/layout-group.tsx`.
 */
import type { JSX } from "@solidjs/web"
import { createSignal, createUniqueId, Show, type Component } from "solid-js"
import { LayoutGroup, motion, MotionConfig, type Transition } from "../../src"
import { query, should, trigger, visit, VIEWPORT, wait } from "./utils"

const transition: Transition = {
    layout: {
        type: "tween",
        duration: 1,
    },
}

function App() {
    const [visible, setVisible] = createSignal(false)
    return (
        <div
            style={{
                display: "flex",
                "justify-content": "center",
                height: "100vh",
            }}
        >
            <div
                style={{
                    display: "flex",
                    "flex-direction": "column",
                    gap: "10px",
                    "align-items": "center",
                    height: "100vh",
                    width: "500px",
                }}
            >
                <Show when={visible()}>
                    <div
                        style={{
                            "background-color": "green",
                            width: "100px",
                            height: "100px",
                        }}
                    />
                </Show>
                <LayoutGroup>
                    <MotionConfig transition={transition}>
                        <motion.div id="expander-wrapper" layout="position">
                            <Expander />
                        </motion.div>
                        <motion.div
                            id="text-wrapper"
                            layout="position"
                            style={{
                                display: "flex",
                                gap: 4,
                                alignItems: "center",
                            }}
                        >
                            some text
                            <LayoutGroup inherit="id">
                                <Button
                                    onClick={() =>
                                        setVisible((current) => !current)
                                    }
                                />
                            </LayoutGroup>
                        </motion.div>
                    </MotionConfig>
                </LayoutGroup>
            </div>
        </div>
    )
}

/**
 * Port note: Solid has no `Fragment` component, a component rendering its children stands in.
 */
const Fragment = (props: { children?: JSX.Element }) => <>{props.children}</>
const Variants = motion.create(Fragment)

function Expander() {
    const [expanded, setExpanded] = createSignal(false)
    const id = createUniqueId()
    return (
        <Variants>
            <motion.div
                id="expander"
                layoutId={id}
                onClick={() => setExpanded((current) => !current)}
                style={{
                    height: expanded() ? 100 : 25,
                    backgroundColor: "red",
                    marginBottom: 4,
                    cursor: "pointer",
                }}
                transition={{ type: "tween" }}
            >
                {expanded() ? "collapse" : "expand"} me
            </motion.div>
        </Variants>
    )
}

function Button(props: { onClick?: VoidFunction }) {
    const id = createUniqueId()

    return (
        <motion.div
            id="button"
            layoutId={id}
            style={{
                background: "blue",
                color: "white",
                borderRadius: 8,
                padding: 10,
                cursor: "pointer",
            }}
            onClick={() => props.onClick?.()}
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

/**
 * The button's top is recorded on every animation frame, so the "doesn't
 * jump" checks see every rendered position rather than a single sample
 * taken after a fixed wait, which slow CI can overshoot.
 */
const buttonTop = (button: HTMLElement) =>
    Math.round(button.getBoundingClientRect().top)

let stopRecording: VoidFunction | undefined

function recordButtonTops() {
    const tops: number[] = []
    const button = query("#button")
    let id: number
    const record = () => {
        tops.push(buttonTop(button))
        id = requestAnimationFrame(record)
    }
    record()
    stopRecording = () => cancelAnimationFrame(id)
    return tops
}

afterEach(() => {
    stopRecording?.()
    stopRecording = undefined
})

/**
 * Unrounded, so this waits for the layout animation to finish rather than
 * its eased tail.
 */
async function expectButtonToSettleAt(top: number) {
    /**
     * Cypress' commands are asynchronous: the first check never runs in the same task as the
     * click, before Motion's layout update (a microtask) has projected #button.
     */
    await wait(0)
    await should(() => {
        expect(query("#button").getBoundingClientRect().top).toBe(top)
    })
}

/**
 * Port note: upstream's expectations were recorded with Cypress 4, whose Electron (Chrome 80)
 * doesn't support flexbox `gap` (Chrome 84+). In current browsers the page's `gap: 10` adds 10px
 * per gap above #button: motion/react 14.0.0 renders the same page with #button settling at
 * 114 (not 104) after expanding, and at 149 (not 129) after adding the green box. The
 * coordinates below are upstream's plus that offset.
 */
const gap = 10

function expectFramesBetween(tops: number[], from: number, to: number) {
    const between = tops.filter((top) => top !== from && top !== to)
    expect(
        between,
        `frames other than ${from} and ${to}: ${tops}`
    ).not.toHaveLength(0)
}

describe(`LayoutGroup inherit="id"`, () => {
    it("relative children should not instantly jump to new layout", async () => {
        await visitAt(App, 500, 500)
        await wait(250)

        const tops = recordButtonTops()
        trigger(query("#expander"), "click")
        await expectButtonToSettleAt(104 + gap)

        // Should have rendered positions between the original and final
        expectFramesBetween(tops, tops[0], 104 + gap)
    })

    it("relative children should not instantly jump to new layout, after performing their own layout animation", async () => {
        await visitAt(App, 500, 500)
        await wait(250)

        // Click button first and let it finish its own layout animation
        trigger(query("#button"), "click")
        await expectButtonToSettleAt(129 + 2 * gap)

        const tops = recordButtonTops()
        trigger(query("#expander"), "click")
        await expectButtonToSettleAt(204 + 2 * gap)

        expectFramesBetween(tops, 129 + 2 * gap, 204 + 2 * gap)
    })

    it("should return to original state when expander is clicked twice with delay", async () => {
        await visitAt(App, 500, 500)
        await wait(250)

        const tops = recordButtonTops()
        trigger(query("#expander"), "click")

        // Click the expander again once the button is mid-animation
        await should(() => expectFramesBetween(tops, tops[0], 104 + gap))
        await wait(50)
        trigger(query("#expander"), "click")

        // Should be back to original state
        await expectButtonToSettleAt(tops[0])
    })
})
