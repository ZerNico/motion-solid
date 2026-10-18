/**
 * Port of upstream's `cypress/integration/issue-2833-fixed-position.ts` and its page,
 * `dev/react/src/tests/issue-2833-fixed-position.tsx`.
 */
import { motion } from "../../src"
import { query, visit } from "./utils"

/**
 * Regression test for #2833.
 *
 * React-select with menuPosition="fixed" relies on the menu being positioned
 * relative to the viewport, not to its ancestors. CSS spec: an ancestor with
 * `transform`, `perspective`, `filter`, `backdrop-filter`, or `will-change`
 * (containing those properties) establishes a containing block for fixed
 * descendants — breaking that assumption.
 *
 * motion.div should not apply any of those by default, even when transform
 * animations are configured via animate/whileHover/whileTap.
 */
function App(props: { variant?: string }) {
    const variant = props.variant ?? "plain"

    const child = () => (
        <div
            id="fixed-child"
            style={{
                position: "fixed",
                top: "10px",
                left: "10px",
                width: "50px",
                height: "50px",
                background: "red",
            }}
        />
    )

    let parent
    if (variant === "while-hover") {
        parent = (
            <motion.div id="parent" whileHover={{ scale: 1.1 }}>
                {child()}
            </motion.div>
        )
    } else if (variant === "while-tap") {
        parent = (
            <motion.div id="parent" whileTap={{ scale: 0.9 }}>
                {child()}
            </motion.div>
        )
    } else if (variant === "animate-transform") {
        parent = (
            <motion.div id="parent" animate={{ x: 0, y: 0 }}>
                {child()}
            </motion.div>
        )
    } else if (variant === "initial-transform") {
        parent = (
            <motion.div
                id="parent"
                initial={{ scale: 1 }}
                animate={{ scale: 1 }}
            >
                {child()}
            </motion.div>
        )
    } else {
        parent = <motion.div id="parent">{child()}</motion.div>
    }

    return <div style={{ padding: "200px" }}>{parent}</div>
}

/**
 * Regression test for #2833.
 *
 * React-select with menuPosition="fixed" was rendering in the wrong position
 * because motion.div applied will-change: transform automatically, which
 * establishes a CSS containing block for position: fixed descendants. The
 * auto will-change behaviour was removed but plain transform/filter/etc.
 * should also never be applied by default.
 */
const variants = [
    "plain",
    "while-hover",
    "while-tap",
    "animate-transform",
    "initial-transform",
]

describe("position: fixed children inside motion.div (#2833)", () => {
    for (const variant of variants) {
        it(`motion.div does not establish a containing block (variant=${variant})`, async () => {
            await visit(App, { variant })

            const cs = getComputedStyle(query("#parent"))
            expect(cs.transform).toBe("none")
            expect(cs.perspective).toBe("none")
            expect(cs.filter).toBe("none")
            // willChange of "transform"/"perspective"/"filter" would also
            // establish a containing block.
            expect(cs.willChange).toBe("auto")

            // The fixed-positioned child should land at viewport (10, 10),
            // not offset by the wrapper's 200px padding.
            const rect = query("#fixed-child").getBoundingClientRect()
            expect(rect.top).toBe(10)
            expect(rect.left).toBe(10)
        })
    }
})
