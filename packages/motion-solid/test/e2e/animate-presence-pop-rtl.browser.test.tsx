/**
 * Port of upstream's `cypress/integration/animate-presence-pop-rtl.ts` and its page,
 * `dev/react/src/tests/animate-presence-pop-rtl.tsx`.
 */
import { createSignal } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

function App() {
    const [state, setState] = createSignal(true)

    return (
        <div dir="rtl">
            <div
                id="container"
                style={{
                    display: "flex",
                    width: "fit-content",
                    position: "relative",
                }}
                onClick={() => setState(!state())}
            >
                <AnimatePresence mode="popLayout">
                    <motion.div
                        id="a"
                        style={{
                            width: 100,
                            height: 100,
                            backgroundColor: "red",
                        }}
                    />
                    <Show when={state()}>
                        <motion.div
                            id="b"
                            exit={{
                                opacity: 0,
                                transition: { duration: 10 },
                            }}
                            style={{
                                width: 100,
                                height: 100,
                                backgroundColor: "green",
                            }}
                        />
                    </Show>
                </AnimatePresence>
            </div>
        </div>
    )
}

describe("AnimatePresence popLayout RTL", () => {
    it("correctly pops exiting elements in RTL direction without shifting", async () => {
        await visit(App)
        await wait(50)
        const initialLeft = query("#b").getBoundingClientRect().left
        trigger(query("#container"), "click", { x: 60, y: 60, force: true })
        await wait(100)
        await should(() => {
            const bbox = query("#b").getBoundingClientRect()
            expect(bbox.left).toBe(initialLeft)
        })
    })
})
