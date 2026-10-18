/**
 * Port of upstream's `cypress/integration/animate-presence-pop-interrupt.ts` and its page,
 * `dev/react/src/tests/animate-presence-pop-interrupt.tsx`.
 */
import { createSignal } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const containerStyles = {
    position: "relative" as const,
    display: "flex",
    flexDirection: "column" as const,
    padding: "100px",
}

const boxStyles = {
    width: "100px",
    height: "100px",
    backgroundColor: "red",
}

function App() {
    const [show, setShow] = createSignal(true)

    return (
        <div id="container" style={containerStyles}>
            <button id="toggle" onClick={() => setShow(!show())}>
                Toggle
            </button>
            <AnimatePresence mode="popLayout">
                <motion.div id="a" layout style={boxStyles} />
                <Show when={show()}>
                    <motion.div
                        id="target"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{
                            opacity: 0,
                            transition: { duration: 10 },
                        }}
                        style={{
                            ...boxStyles,
                            backgroundColor: "green",
                        }}
                    />
                </Show>
                <motion.div
                    id="c"
                    layout
                    style={{
                        ...boxStyles,
                        backgroundColor: "blue",
                    }}
                />
            </AnimatePresence>
        </div>
    )
}

describe("AnimatePresence popLayout interrupt", () => {
    it("removes data-motion-pop-id when exit animation is interrupted", async () => {
        await visit(App)
        await wait(50)
        await should(() => {
            const $el = query("#target")
            // Initially no pop id
            expect($el.hasAttribute("data-motion-pop-id")).toBe(false)
            // Let the entry animation finish first. Exiting to opacity 0
            // before it has rendered has nothing to animate, so the
            // element would be removed immediately.
            expect(getComputedStyle($el).opacity).toBe("1")
        })
        // Click to start exit (long duration so it won't complete)
        trigger(query("#toggle"), "click")
        await wait(200)
        await should(() => {
            // During exit, element should have pop id
            expect(query("#target").hasAttribute("data-motion-pop-id")).toBe(
                true
            )
        })
        // Click again to re-enter (interrupt the exit)
        trigger(query("#toggle"), "click")
        await wait(200)
        await should(() => {
            // After re-entry, pop id must be removed
            expect(query("#target").hasAttribute("data-motion-pop-id")).toBe(
                false
            )
        })
    })
})
