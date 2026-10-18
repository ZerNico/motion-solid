/**
 * Port of upstream's `cypress/integration/animate-presence-switch-waapi.ts` and its page,
 * `dev/react/src/tests/animate-presence-switch-waapi.tsx`.
 */
import { createSignal } from "solid-js"
import { AnimatePresence, motion, Show, useMotionValue } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

function App() {
    const count = useMotionValue(0)
    const [state, setState] = createSignal(0)

    return (
        <>
            <button
                id="switch"
                onClick={() => {
                    state() === 0 ? setState(1) : setState(0)
                }}
            >
                Switch
            </button>
            <div>
                Animation count: <motion.span id="count">{count}</motion.span>
            </div>
            <AnimatePresence initial={false}>
                {/* `key={state}`: keyed by the string, as `0` would be falsy. */}
                <Show when={String(state())} keyed>
                    {(key) => (
                        <motion.div
                            id={key}
                            class="item"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onAnimationStart={() => {
                                count.set(count.get() + 1)
                            }}
                        >
                            {key}
                        </motion.div>
                    )}
                </Show>
            </AnimatePresence>
        </>
    )
}

const items = () => document.querySelectorAll(".item")

describe("AnimatePresence with WAAPI animations", () => {
    // Is a differing number in StrictMode even a bug here?
    it("Correct number of animations trigger", async () => {
        await visit(App)
        await wait(100)
        trigger(query("#switch"), "click", { x: 10, y: 10, force: true })
        await wait(400)
        await should(() => {
            // Strict Mode works differently in 18/19, React 19 may fire more
            expect(query("#count").textContent).toMatch(/^[234]$/)
        })
    })

    it("Interrupting exiting animation doesn't break exit", async () => {
        await visit(App)
        await wait(100)
        await should(() => {
            expect(items().length).toBe(1)
            expect(items()[0].textContent).toBe("0")
        })
        trigger(query("#switch"), "click", { x: 10, y: 10, force: true })
        await wait(100)
        await should(() => {
            expect(items().length).toBe(2)
            expect(items()[0].textContent).toBe("0")
            expect(items()[1].textContent).toBe("1")
        })
        await wait(300)
        await should(() => {
            expect(items().length).toBe(1)
            expect(items()[0].textContent).toBe("1")
        })
        trigger(query("#switch"), "click", { x: 10, y: 10, force: true })
        await wait(50)
        trigger(query("#switch"), "click", { x: 10, y: 10, force: true })
        await wait(50)
        trigger(query("#switch"), "click", { x: 10, y: 10, force: true })
        await wait(400)
        await should(() => {
            expect(items().length).toBe(1)
            expect(items()[0].textContent).toBe("0")
        })
    })

    it("Interrupting exiting animation fire more animations than expected", async () => {
        await visit(App)
        await wait(100)
        await should(() => {
            expect(items().length).toBe(1)
            expect(items()[0].textContent).toBe("0")
        })
        trigger(query("#switch"), "click", { x: 10, y: 10, force: true })
        await wait(50)
        trigger(query("#switch"), "click", { x: 10, y: 10, force: true })
        await wait(400)
        await should(() => {
            // Strict Mode works differently in 18/19, React 19 may fire more
            expect(query("#count").textContent).toMatch(/^[4567]$/)
        })
    })
})
