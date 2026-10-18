/**
 * Port of upstream's `cypress/integration/animate-presence-wait-exit-key-change.ts` and its page,
 * `dev/react/src/tests/animate-presence-wait-exit-key-change.tsx`.
 *
 * mode="wait" where the key changes again at the moment the exiting child
 * finishes its exit, with no transitions involved.
 */
import { createSignal } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

function App() {
    const [count, setCount] = createSignal(0)
    let armed = false

    return (
        <div>
            <button
                id="next"
                onClick={() => {
                    armed = true
                    setCount(1)
                }}
            >
                next
            </button>
            <p id="state">{count()}</p>
            <AnimatePresence mode="wait" initial={false}>
                {/* `key={count}`: keyed by the string, as `0` would be falsy. */}
                <Show when={String(count())} keyed>
                    {(key) => (
                        <motion.div
                            id={`child-${key}`}
                            class="child"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            onAnimationComplete={() => {
                                // Upstream's closure sees the `count` this child rendered with.
                                if (key === "0" && armed) {
                                    armed = false
                                    setCount(2)
                                }
                            }}
                        >
                            {key}
                        </motion.div>
                    )}
                </Show>
            </AnimatePresence>
        </div>
    )
}

describe("AnimatePresence mode=wait: key changes as the exit completes", () => {
    it("renders the latest child", async () => {
        await visit(App)
        await wait(100)
        trigger(query("#next"), "click")
        await should(() => expect(query("#state").textContent).toBe("2"))
        await should(
            () => {
                const $children = document.querySelectorAll(".child")
                expect($children.length).toBe(1)
                expect($children[0].id).toBe("child-2")
                expect(getComputedStyle($children[0]).opacity).toBe("1")
            },
            { timeout: 2000 }
        )
    })
})
