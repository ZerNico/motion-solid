/**
 * Port of upstream's `cypress/integration/layout-shared-percent-xy-parent.ts` and its page,
 * `dev/react/src/tests/layout-shared-percent-xy-parent.tsx`.
 */
import { createSignal, For } from "solid-js"
import { motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

/**
 * Reproduction for #3254: layout animation breaks when nested
 * in a parent motion.div with percentage x/y values.
 */
function App() {
    const [selected, setSelected] = createSignal(0)

    return (
        <motion.div
            style={{
                x: "25%",
                y: "25%",
                width: 300,
            }}
        >
            <div style={{ display: "flex", height: "32px" }}>
                <For each={[0, 1, 2]}>
                    {(index) => (
                        <div
                            id={`tab-${index}`}
                            onClick={() => setSelected(index)}
                            style={{
                                flex: 1,
                                position: "relative",
                                cursor: "pointer",
                            }}
                        >
                            <Show when={selected() === index}>
                                <motion.div
                                    layoutId="indicator"
                                    id="indicator"
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        height: 4,
                                        background: "red",
                                    }}
                                    transition={{
                                        duration: 10,
                                        ease: () => 0.5,
                                    }}
                                />
                            </Show>
                        </div>
                    )}
                </For>
            </div>
        </motion.div>
    )
}

describe("Layout animation with percentage x/y parent (#3254)", () => {
    it("layoutId indicator animates to correct position within parent with percentage x/y", async () => {
        await visit(App)
        await wait(200)
        await should(() =>
            expect(document.querySelector("#indicator")).not.toBeNull()
        )
        // Click tab 2 to trigger layout animation
        trigger(query("#tab-2"), "click", { force: true })
        await wait(500)
        await should(() => {
            const bbox = query("#indicator").getBoundingClientRect()
            // With ease: () => 0.5 and duration: 10s, at any point during
            // the animation (which lasts 10s), progress is always 0.5.
            //
            // Parent is 300px wide with x: "25%" = 75px translate.
            // Tab 0 starts at 75px, tab 2 starts at 275px (75 + 200).
            // At 50% progress: 75 + (275-75)*0.5 = 175px.
            //
            // If the layout animation is broken due to the percentage x/y
            // parent, the indicator snaps to 275 (final position) instead.
            expect(bbox.left).toBeGreaterThan(100)
            expect(bbox.left).toBeLessThan(250)
        })
    })
})
