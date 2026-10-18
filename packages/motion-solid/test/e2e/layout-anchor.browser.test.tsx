/**
 * Port of upstream's `cypress/integration/layout-anchor.ts` and its page,
 * `dev/react/src/tests/layout-anchor.tsx`.
 */
import { createSignal, For } from "solid-js"
import { motion } from "../../src"
import { query, trigger, visit, wait } from "./utils"

const presets = [
    { label: "TL", x: 0, y: 0 },
    { label: "TC", x: 0.5, y: 0 },
    { label: "TR", x: 1, y: 0 },
    { label: "CL", x: 0, y: 0.5 },
    { label: "C", x: 0.5, y: 0.5 },
    { label: "CR", x: 1, y: 0.5 },
    { label: "BL", x: 0, y: 1 },
    { label: "BC", x: 0.5, y: 1 },
    { label: "BR", x: 1, y: 1 },
]

const caption = {
    "font-family": "system-ui, sans-serif",
    "font-size": "13px",
    "margin-bottom": "8px",
    color: "#aaa",
}

const parentTransition = {
    type: "tween",
    ease: "linear",
    duration: 1,
} as const

const childTransition = {
    type: "tween",
    ease: "linear",
    duration: 1,
    delay: 0.5,
} as const

/**
 * Test for layoutAnchor prop with custom anchor point controls.
 *
 * Click the parent boxes to toggle expanded/collapsed.
 * Use the sliders to adjust the anchor point of the green child.
 * The red child has no anchor for comparison.
 */
function App() {
    const [expanded, setExpanded] = createSignal(false)
    const [anchorX, setAnchorX] = createSignal(0.5)
    const [anchorY, setAnchorY] = createSignal(0.5)

    const parentStyle = () => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: expanded() ? 400 : 200,
        height: expanded() ? 400 : 200,
        background: "rgba(0,0,0,0.1)",
        cursor: "pointer",
    })

    return (
        <>
            <div
                style={{
                    position: "fixed",
                    top: "10px",
                    right: "10px",
                    padding: "16px",
                    background: "#fff",
                    "border-radius": "8px",
                    "box-shadow": "0 2px 10px rgba(0,0,0,0.15)",
                    "z-index": 10,
                    color: "#333",
                    "font-family": "system-ui, sans-serif",
                    "font-size": "14px",
                    "min-width": "200px",
                }}
            >
                <div style={{ "font-weight": 600, "margin-bottom": "12px" }}>
                    layoutAnchor
                </div>
                <label style={{ display: "block", "margin-bottom": "8px" }}>
                    x: {anchorX().toFixed(2)}
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={anchorX()}
                        onInput={(e) =>
                            setAnchorX(parseFloat(e.currentTarget.value))
                        }
                        style={{ display: "block", width: "100%" }}
                    />
                </label>
                <label style={{ display: "block", "margin-bottom": "8px" }}>
                    y: {anchorY().toFixed(2)}
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={anchorY()}
                        onInput={(e) =>
                            setAnchorY(parseFloat(e.currentTarget.value))
                        }
                        style={{ display: "block", width: "100%" }}
                    />
                </label>
                <div
                    style={{
                        display: "flex",
                        gap: "6px",
                        "flex-wrap": "wrap",
                        "margin-top": "4px",
                    }}
                >
                    <For each={presets}>
                        {(preset) => {
                            const isActive = () =>
                                anchorX() === preset.x && anchorY() === preset.y
                            return (
                                <button
                                    onClick={() => {
                                        setAnchorX(preset.x)
                                        setAnchorY(preset.y)
                                    }}
                                    style={{
                                        padding: "4px 8px",
                                        border: isActive()
                                            ? "2px solid #007aff"
                                            : "1px solid #ccc",
                                        "border-radius": "4px",
                                        background: isActive()
                                            ? "#e8f0fe"
                                            : "#fff",
                                        cursor: "pointer",
                                        "font-size": "12px",
                                    }}
                                >
                                    {preset.label}
                                </button>
                            )
                        }}
                    </For>
                </div>
                <div
                    style={{
                        "margin-top": "12px",
                        padding: "8px",
                        background: "#f5f5f5",
                        "border-radius": "4px",
                        "font-size": "12px",
                        "font-family": "monospace",
                    }}
                >
                    {`{ x: ${anchorX()}, y: ${anchorY()} }`}
                </div>
            </div>

            <div style={{ display: "flex", gap: "40px", padding: "20px" }}>
                <div>
                    <div style={caption}>With layoutAnchor (green)</div>
                    <motion.div
                        id="parent"
                        layout
                        onClick={() => setExpanded(!expanded())}
                        style={parentStyle()}
                        transition={parentTransition}
                    >
                        <motion.div
                            id="child-anchored"
                            layout
                            layoutAnchor={{ x: anchorX(), y: anchorY() }}
                            style={{
                                width: 50,
                                height: 50,
                                background: "green",
                            }}
                            transition={childTransition}
                        />
                    </motion.div>
                </div>

                <div>
                    <div style={caption}>Without layoutAnchor (red)</div>
                    <motion.div
                        id="parent-no-anchor"
                        layout
                        onClick={() => setExpanded(!expanded())}
                        style={parentStyle()}
                        transition={parentTransition}
                    >
                        <motion.div
                            id="child-no-anchor"
                            layout
                            style={{
                                width: 50,
                                height: 50,
                                background: "red",
                            }}
                            transition={childTransition}
                        />
                    </motion.div>
                </div>

                <div>
                    <div style={caption}>layoutAnchor={"{false}"} (blue)</div>
                    <motion.div
                        id="parent-false-anchor"
                        layout
                        onClick={() => setExpanded(!expanded())}
                        style={parentStyle()}
                        transition={parentTransition}
                    >
                        <motion.div
                            id="child-false-anchor"
                            layout
                            layoutAnchor={false}
                            style={{
                                width: 50,
                                height: 50,
                                background: "dodgerblue",
                            }}
                            transition={childTransition}
                        />
                    </motion.div>
                </div>
            </div>
        </>
    )
}

describe("layoutAnchor: centered child stays centered during parent resize", () => {
    it("Child with layoutAnchor={x:0.5,y:0.5} stays centered mid-animation", async () => {
        await visit(App)
        await wait(50)
        trigger(query("#parent"), "click")
        // Wait 250ms (25% through 1s linear parent animation, child hasn't started yet)
        await wait(250)
        const parent = query("#parent")
        const parentRect = parent.getBoundingClientRect()
        const parentCenterX = parentRect.left + parentRect.width / 2
        const parentCenterY = parentRect.top + parentRect.height / 2

        const child = parent.querySelector("#child-anchored")!
        const childRect = child.getBoundingClientRect()
        const childCenterX = childRect.left + childRect.width / 2
        const childCenterY = childRect.top + childRect.height / 2

        // With layoutAnchor={x:0.5,y:0.5}, child should stay centered
        expect(Math.abs(childCenterX - parentCenterX)).toBeLessThanOrEqual(15)
        expect(Math.abs(childCenterY - parentCenterY)).toBeLessThanOrEqual(15)
    })

    it("Child without layoutAnchor drifts from center mid-animation", async () => {
        await visit(App)
        await wait(50)
        trigger(query("#parent"), "click")
        await wait(250)
        const parent = query("#parent-no-anchor")
        const parentRect = parent.getBoundingClientRect()
        const parentCenterX = parentRect.left + parentRect.width / 2

        const child = parent.querySelector("#child-no-anchor")!
        const childRect = child.getBoundingClientRect()
        const childCenterX = childRect.left + childRect.width / 2

        // Without layoutAnchor, the child should drift away from center
        const drift = Math.abs(childCenterX - parentCenterX)
        expect(drift).toBeGreaterThan(5)
    })
})
