/**
 * Port of upstream's `cypress/integration/css-vars.ts` and its page,
 * `dev/react/src/tests/css-vars.tsx`.
 */
import { motion, useMotionValue } from "../../src"
import { query, should, visit, wait } from "./utils"

/**
 * An example of the Motion keyframes syntax.
 */

const style = {
    width: 100,
    height: 100,
    backgroundColor: "#f00",
    x: 0,
    borderRadius: 20,
}
let isFirstFrame = true
function App() {
    const content = useMotionValue("")

    return (
        <div
            style={{ "--a": "#00F", "--b": "100px", "--c": "2", "--d": "0.5" }}
        >
            <motion.div
                animate={{
                    originX: 0,
                    originY: 0,
                    opacity: "var(--d)",
                    backgroundColor: " var(--a)", // Should work even with space at start
                    scale: "var(--c)",
                    x: "var(--b)",
                }}
                transition={{ duration: 0.1 }}
                style={style}
                onUpdate={({ scale }) => {
                    if (isFirstFrame) {
                        content.set(
                            typeof scale === "string" ? "Fail" : "Success"
                        )
                    }
                    isFirstFrame = false
                }}
                id="test"
            >
                {content}
            </motion.div>
        </div>
    )
}

describe("CSS variables", () => {
    it("Numerical CSS var values are resolved and animated correctly", async () => {
        await visit(App)
        await wait(100)
        await should(() => {
            expect(query("#test").textContent).toBe("Success")
        })
    })
})
