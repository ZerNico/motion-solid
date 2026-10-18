/**
 * Port of upstream's `cypress/integration/layout-shared-fragment.ts` and its page,
 * `dev/react/src/tests/layout-shared-fragment.tsx`.
 *
 * Port note: upstream wraps each `motion.div` in a React `Fragment`. Solid has no fragment
 * component (a component can return its element directly), so `A` and `B` return the
 * `motion.div`, which is what the fragment renders to.
 */
import { createSignal } from "solid-js"
import { motion, Show } from "../../src"
import { query, should, trigger, visit, wait, type BoundingBox } from "./utils"

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

const box = {
    position: "absolute",
    left: 0,
    background: "red",
} as const

const a = {
    ...box,
    top: 100,
    width: 100,
    height: 100,
}

const b = {
    ...box,
    top: 300,
    width: 100,
    height: 100,
}

function A(props: { onClick: () => void }) {
    return (
        <motion.div
            id="box"
            data-testid="box"
            layoutId="box"
            style={a}
            onClick={() => props.onClick()}
            transition={{ duration: 1, ease: () => 0.5 }}
        />
    )
}

function B(props: { onClick: () => void }) {
    return (
        <motion.div
            id="box"
            data-testid="box"
            layoutId="box"
            style={b}
            onClick={() => props.onClick()}
            transition={{ duration: 1, ease: () => 0.5 }}
        />
    )
}

function App() {
    const [state, setState] = createSignal(true)

    return (
        <Show when={state()} fallback={<B onClick={() => setState(true)} />}>
            <A onClick={() => setState(false)} />
        </Show>
    )
}

describe("Shared layout: Fragment", () => {
    it("Elements with layoutId inside a Fragment should animate from the correct starting position", async () => {
        await visit(App)
        await wait(50)
        await should(() =>
            expectBbox(query("#box"), {
                top: 100,
                left: 0,
                width: 100,
                height: 100,
            })
        )
        trigger(query("#box"), "click")
        await wait(200)
        await should(() => {
            // At ease: () => 0.5, the element should be halfway
            // between top: 100 and top: 300, i.e. top: 200.
            // If the bug is present, it will start from top: 0
            // and be at top: 150 instead.
            const bbox = query("#box").getBoundingClientRect()
            expect(bbox.top).toBe(200)
        })
    })
})
