/**
 * Port of upstream's `cypress/integration/layout-cancelled-finishes.ts` and its page,
 * `dev/react/src/tests/layout-cancelled-finishes.tsx`.
 */
import { createSignal } from "solid-js"
import {
    AnimatePresence,
    motion,
    Show,
    useInstantLayoutTransition,
} from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const App = () => {
    const [isVisible, setIsVisible] = createSignal(true)
    const startTransition = useInstantLayoutTransition()

    return (
        <AnimatePresence>
            <Show when={isVisible()}>
                <motion.div
                    onClick={() => startTransition(() => setIsVisible(false))}
                    data-testid="cancellable"
                    style={{ height: 100 }}
                />
            </Show>
        </AnimatePresence>
    )
}

describe("Cancelled Animation", () => {
    it("Allows the animation to be marked complete", async () => {
        await visit(App)
        trigger(query("[data-testid='cancellable']"), "click")
        await wait(200)
        await should(() => {
            const cancellable = document.querySelector(
                "[data-testid='cancellable']"
            )
            expect(cancellable).toBeNull()
        })
    })
})
