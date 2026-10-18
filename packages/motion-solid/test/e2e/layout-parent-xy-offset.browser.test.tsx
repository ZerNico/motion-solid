/**
 * Port of upstream's `cypress/integration/layout-parent-xy-offset.ts` and its page,
 * `dev/react/src/tests/layout-parent-xy-offset.tsx`.
 */
import { createSignal, createUniqueId, For, Show } from "solid-js"
import { motion } from "../../src"
import { visit, wait } from "./utils"

function Tabs() {
    const items = ["a", "b", "c", "d", "e"]
    const [selectedIndex, setSelectedIndex] = createSignal(0)
    const uuid = createUniqueId()

    return (
        <div
            style={{
                display: "flex",
                gap: "10px",
                height: "64px",
                width: "500px",
                "margin-bottom": "12px",
            }}
        >
            <For each={items}>
                {(item, index) => (
                    <div
                        onClick={() => setSelectedIndex(index())}
                        style={{
                            flex: 1,
                            "border-radius": "8px",
                            position: "relative",
                            display: "flex",
                            "align-items": "center",
                            "justify-content": "center",
                            background: "#eee",
                        }}
                    >
                        <div
                            style={{
                                position: "relative",
                                "z-index": 1,
                                color: "white",
                            }}
                        >
                            {item}
                        </div>
                        <Show when={selectedIndex() === index()}>
                            <motion.div
                                layoutId={"selected-" + uuid}
                                class="indicator"
                                style={{
                                    position: "absolute",
                                    top: 4,
                                    left: 4,
                                    right: 4,
                                    bottom: 4,
                                    background: "#444ccc",
                                    borderRadius: 8,
                                }}
                            />
                        </Show>
                    </div>
                )}
            </For>
        </div>
    )
}

const App = () => {
    return (
        <div style={{ padding: "12px" }}>
            <motion.div id="motion-parent" style={{ x: 50, y: 50 }}>
                <div style={{ "margin-bottom": "12px" }}>
                    Motion (x: 50, y: 50)
                </div>
                <Tabs />
            </motion.div>
            <div style={{ transform: "translate3d(50px, 50px, 0)" }}>
                <div style={{ "margin-bottom": "12px" }}>Transform</div>
                <Tabs />
            </div>
            <div id="result" />
        </div>
    )
}

describe("Layout: nested in motion.div with x/y (#3244)", () => {
    it("layoutId element inside motion.div with x/y should not get a projection transform on mount", async () => {
        // Set up MutationObserver before rendering so we catch
        // any transient projection transforms on mount
        const projectionTransforms: string[] = []
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.attributeName !== "style") continue
                const el = m.target as HTMLElement
                if (!el.classList?.contains("indicator")) continue
                const motionParent = document.getElementById("motion-parent")
                if (!motionParent?.contains(el)) continue
                const t = el.style.transform
                if (t && t !== "none") {
                    projectionTransforms.push(t)
                }
            }
        })
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["style"],
            subtree: true,
        })

        try {
            await visit(App)
            await wait(500)
            // The MutationObserver records every non-"none" transform
            // set on the indicator inside the motion.div parent.
            // If the bug is present, the projection system will briefly
            // apply a translate() transform on mount.
            expect(
                projectionTransforms.length,
                `expected no projection transforms but got: ${projectionTransforms.join(
                    ", "
                )}`
            ).toBe(0)
        } finally {
            observer.disconnect()
        }
    })
})
