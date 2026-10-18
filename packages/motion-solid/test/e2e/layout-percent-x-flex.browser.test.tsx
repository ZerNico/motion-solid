/**
 * Port of upstream's `cypress/integration/layout-percent-x-flex.ts` and its page,
 * `dev/react/src/tests/layout-percent-x-flex.tsx`.
 */
import { createSignal, For } from "solid-js"
import { motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

/**
 * Regression test for https://github.com/motiondivision/motion/issues/3401
 *
 * Matches the reporter's sandbox pattern: only the most-recently-added item
 * has initial/animate props. When the next item is added, shouldAnimate flips
 * false for the previous item — its x animation stops and latestValues.x
 * stays at "100%" indefinitely. The layout update then fires with an
 * unresolved percentage, triggering the teleport bug.
 */

interface Item {
    id: number
    isAdded: boolean
}

const App = () => {
    const [items, setItems] = createSignal<Item[]>([
        { id: 0, isAdded: false },
        { id: 1, isAdded: false },
    ])

    const addItem = () =>
        setItems((prev) => [...prev, { id: prev.length, isAdded: true }])

    return (
        <div
            style={{
                display: "flex",
                "flex-direction": "column",
                "align-items": "center",
                padding: "20px",
            }}
        >
            <button id="add" onClick={addItem}>
                Add
            </button>
            <div style={{ display: "flex", gap: "10px", "margin-top": "20px" }}>
                <For each={items()}>
                    {(item, i) => {
                        const shouldAnimate = () =>
                            i() === items().length - 1 && item.isAdded

                        return (
                            <motion.div
                                layout
                                id={`item-${item.id}`}
                                initial={
                                    shouldAnimate() ? { x: "100%" } : undefined
                                }
                                animate={shouldAnimate() ? { x: 0 } : undefined}
                                transition={{ duration: 10 }}
                                style={{
                                    width: 100,
                                    height: 100,
                                    background: "red",
                                    flexShrink: 0,
                                }}
                            />
                        )
                    }}
                </For>
            </div>
        </div>
    )
}

describe("Layout animation: percentage x in flex container", () => {
    it("Correctly layout-animates when sibling added before keyframes resolve", async () => {
        await visit(App)
        // First click: item-2 is added with initial={{ x: "100%" }},
        // animate={{ x: 0 }}, latestValues.x = "100%"
        trigger(query("#add"), "click")
        // Second click: item-3 is added, shouldAnimate flips false for
        // item-2 → its animate prop is removed → x animation stops →
        // latestValues.x stays at "100%". Layout update fires immediately.
        trigger(query("#add"), "click")
        await wait(300)
        await should(() => {
            // If the layout animation is running correctly, framer-motion
            // applies a non-identity CSS transform to item-2 (the layout
            // correction that accounts for x: "100%" in latestValues).
            //
            // If the bug occurred, transformBox produced NaN → projection
            // delta was forced to identity → no correction transform →
            // item-2 snapped to its natural DOM position immediately.
            // After snapping, with no animate prop, the transform stays "none".
            const transform = query("#item-2").style.transform
            expect(transform).not.toBe("none")
            expect(transform).not.toBe("")
        })
    })
})
