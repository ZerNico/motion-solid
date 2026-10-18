/**
 * Port of upstream's `cypress/integration/layout-exit.ts` and its page,
 * `dev/react/src/tests/layout-exit.tsx`.
 */
import { createSignal, onSettled } from "solid-js"
import { AnimatePresence, motion, Show } from "../../src"
import { should, visit, wait } from "./utils"

const App = () => {
    const [visible, setVisible] = createSignal(true)

    const animation = {
        x: 0,
        opacity: 0.5,
    }

    onSettled(() => {
        setVisible(!visible())
    })

    return (
        <>
            <AnimatePresence>
                <Show when={visible()}>
                    <motion.div
                        id="box"
                        layout
                        style={{ width: 100, height: 100, background: "blue" }}
                        transition={{ duration: 0.1 }}
                        exit={animation}
                    />
                </Show>
            </AnimatePresence>
        </>
    )
}

describe("Layout exit animations", () => {
    it("Allows the animation to be marked complete", async () => {
        await visit(App)
        await wait(500)
        await should(() => {
            const box = document.querySelector("#box")
            expect(box).toBeNull()
        })
    })
})
