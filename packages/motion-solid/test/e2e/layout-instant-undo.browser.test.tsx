/**
 * Port of upstream's `cypress/integration/layout-instant-undo.ts` and its page,
 * `dev/react/src/tests/layout-instant-undo.tsx`.
 */
import { createEffect, createSignal } from "solid-js"
import { motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const box = {
    position: "absolute",
    top: 0,
    left: 200,
    width: 100,
    height: 100,
    background: "red",
} as const

const a = box

const b = {
    ...box,
    left: 500,
}

const App = () => {
    const [state, setState] = createSignal(true)

    /**
     * Upstream: `useLayoutEffect` that immediately undoes the change.
     */
    createEffect(
        () => state(),
        (value) => {
            if (value === false) setState(true)
        }
    )

    return (
        <motion.div
            id="box"
            data-testid="box"
            layout
            style={state() ? a : b}
            onClick={() => setState(!state())}
            transition={{ duration: 10 }} //, ease: (p) => (p === 1 ? p : 0) }}
        />
    )
}

function expectBbox(element: HTMLElement, expectedBbox: { left: number }) {
    const bbox = element.getBoundingClientRect()
    expect(Math.round(bbox.left)).toBe(expectedBbox.left)
}

describe("Layout animation: Instant layout undo", () => {
    it("Correctly cancels animation", async () => {
        await visit(App)
        await wait(50)
        await should(() => expectBbox(query("#box"), { left: 200 }))
        trigger(query("#box"), "click")
        await wait(50)
        await should(() => expectBbox(query("#box"), { left: 200 }))
    })
})
