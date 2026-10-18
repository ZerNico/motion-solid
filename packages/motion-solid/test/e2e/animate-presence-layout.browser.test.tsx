/**
 * Port of upstream's `cypress/integration/animate-presence-layout.ts` and its page,
 * `dev/react/src/tests/animate-presence-layout.tsx`.
 */
import { createSignal, Show as SolidShow } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

function Component() {
    const [showChild, setShowChild] = createSignal(true)

    return (
        <motion.div>
            <button id="inner" onClick={() => setShowChild(!showChild())}>
                Toggle
            </button>
            {/* Port note: not a direct child of `AnimatePresence` upstream, so Solid's own `Show`. */}
            <SolidShow when={showChild()}>
                <motion.div layout>Hello</motion.div>
            </SolidShow>
        </motion.div>
    )
}

function App() {
    const [showChild, setShowChild] = createSignal(true)

    return (
        <>
            <button id="outer" onClick={() => setShowChild(!showChild())}>
                Toggle outer child
            </button>
            <AnimatePresence initial={false}>
                <Show when={showChild()}>
                    <motion.div
                        id="box"
                        exit={{ opacity: 0 }}
                        style={{ width: 200, height: 200, background: "red" }}
                    >
                        <Component />
                    </motion.div>
                </Show>
            </AnimatePresence>
        </>
    )
}

describe("AnimatePresence", () => {
    it("Ensures all elements are removed", async () => {
        await visit(App)
        await wait(50)
        trigger(query("#inner"), "click", { x: 1, y: 1, force: true })
        await wait(100)
        trigger(query("#outer"), "click", { x: 1, y: 1, force: true })
        await wait(700)
        await should(() => expect(document.querySelector("#box")).toBeNull())
    })
})
