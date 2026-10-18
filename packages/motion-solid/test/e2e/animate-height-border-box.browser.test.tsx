/**
 * Port of upstream's `cypress/integration/animate-height-border-box.ts` and its page,
 * `dev/react/src/tests/animate-height-border-box.tsx`.
 */
import { motion } from "../../src"
import { query, visit, wait } from "./utils"

/**
 * Reproduction for #3147: height: auto with box-sizing: border-box
 * ignores padding, causing animation jumps.
 *
 * Uses a long linear animation so the test can sample the computed height
 * mid-animation. With the bug, the target is 100px (padding subtracted);
 * with the fix, the target is 140px (border-box includes padding).
 */
function App() {
    return (
        <div style={{ padding: "20px" }}>
            <motion.div
                id="box"
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                transition={{ type: "tween", ease: "linear", duration: 10 }}
                style={{
                    boxSizing: "border-box",
                    padding: 20,
                    background: "blue",
                    overflow: "hidden",
                }}
            >
                <div
                    id="content"
                    style={{ height: "100px", background: "red" }}
                />
            </motion.div>
        </div>
    )
}

describe("height: auto with border-box", () => {
    it("animates to correct target height when box-sizing is border-box with padding", async () => {
        await visit(App)
        // Sample at 50% of a 10s linear animation (0 → target).
        // Correct target is 140px (border-box: 100 content + 40 padding),
        // so midpoint ≈ 70px. Bug target was 100px, midpoint ≈ 50px.
        await wait(5000)
        const height = parseFloat(getComputedStyle(query("#box")).height)
        expect(height).toBeGreaterThan(60)
    }, 15000)
})
