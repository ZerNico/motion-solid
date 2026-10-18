/**
 * Port of upstream's `cypress/integration/animate-presence-propagate-empty.ts` and its page,
 * `dev/react/src/tests/animate-presence-propagate-empty.tsx`.
 */
import { createSignal } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit } from "./utils"

function App() {
    const [show, setShow] = createSignal(true)
    const [exitCompleteCount, setExitCompleteCount] = createSignal(0)

    return (
        <>
            <button id="toggle" onClick={() => setShow(false)}>
                Toggle section
            </button>
            <span id="exit-complete-count">{exitCompleteCount()}</span>
            <AnimatePresence
                onExitComplete={() =>
                    setExitCompleteCount((count) => count + 1)
                }
            >
                <Show when={show()}>
                    <motion.section
                        id="section"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    >
                        <AnimatePresence propagate>{null}</AnimatePresence>
                    </motion.section>
                </Show>
            </AnimatePresence>
        </>
    )
}

describe("AnimatePresence propagate", () => {
    it("Completes exit when there are no children", async () => {
        await visit(App)
        trigger(query("#toggle"), "click")
        await should(() =>
            expect(document.querySelector("#section")).toBeNull()
        )
        await should(() =>
            expect(query("#exit-complete-count").textContent).toBe("1")
        )
    })
})
