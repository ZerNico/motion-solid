/**
 * Port of upstream's `cypress/integration/animate-presence-pop-subpixel.ts` and its page,
 * `dev/react/src/tests/animate-presence-pop-subpixel.tsx`.
 */
import { createSignal } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

function App(props: { padding?: string }) {
    const [show, setShow] = createSignal(true)
    const withPadding = () => props.padding === "true"

    return (
        <div id="container" style={{ width: "400.4px", position: "relative" }}>
            <AnimatePresence mode="popLayout">
                <Show when={show()}>
                    <motion.div
                        id="child"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 10 } }}
                        style={
                            withPadding()
                                ? {
                                      width: 200,
                                      padding: 20,
                                      borderWidth: 5,
                                      borderStyle: "solid",
                                      borderColor: "red",
                                      boxSizing: "content-box" as const,
                                  }
                                : undefined
                        }
                    >
                        Content
                    </motion.div>
                </Show>
            </AnimatePresence>
            <button id="toggle" onClick={() => setShow(false)}>
                Toggle
            </button>
        </div>
    )
}

describe("AnimatePresence popLayout subpixel precision", () => {
    it("preserves sub-pixel width when popping layout", async () => {
        await visit(App)
        await wait(50)
        const initialWidth = query("#child").getBoundingClientRect().width

        trigger(query("#toggle"), "click")
        await wait(50)
        await should(() => {
            const poppedWidth = query("#child").getBoundingClientRect().width

            // After pop, width must match the original sub-pixel
            // value within 0.1px — not rounded to an integer.
            expect(Math.abs(poppedWidth - initialWidth)).toBeLessThanOrEqual(
                0.1
            )
        })
    })

    it("preserves width for content-box elements with padding and border", async () => {
        await visit(App, { padding: "true" })
        await wait(50)
        const initialWidth = query("#child").getBoundingClientRect().width

        trigger(query("#toggle"), "click")
        await wait(50)
        await should(() => {
            const poppedWidth = query("#child").getBoundingClientRect().width

            // content-box element with padding (20*2) and border (5*2).
            // Old code used offsetWidth (250) as CSS width, but
            // content-box width only controls the 200px content area,
            // so the element would grow by 50px.
            expect(Math.abs(poppedWidth - initialWidth)).toBeLessThanOrEqual(
                0.5
            )
        })
    })
})
