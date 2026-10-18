/**
 * Port of upstream's `cypress/integration/suspense-animation-resume.ts` and its page,
 * `dev/react/src/tests/suspense-animation-resume.tsx`.
 *
 * Port note: `Suspense` is `<Loading>`. The child suspending (throwing a promise from state set
 * by a timer) is an async memo that turns pending at 400ms and resolves 500ms later. Once content
 * has been shown, Solid's `Loading` keeps it on screen while it revalidates, so the boundary
 * declares the state as a dependency (`on`) to show its fallback again, like React's re-suspended
 * boundary.
 */
import { createMemo, createSignal, Loading, onSettled } from "solid-js"
import { motion } from "../../src"
import { query, should, visit, wait } from "./utils"

function App() {
    const [promise, setPromise] = createSignal<null | Promise<void>>(null)
    let hasSuspended = false

    const suspended = createMemo(() => {
        const pending = promise()
        return pending ? pending.then(() => false) : false
    })

    const SuspendingChild = () => {
        onSettled(() => {
            if (hasSuspended) return

            const suspendTimeout = setTimeout(() => {
                hasSuspended = true
                setPromise(
                    new Promise<void>((resolve) => {
                        setTimeout(() => {
                            resolve()
                            setPromise(null)
                        }, 500)
                    })
                )
            }, 400)

            return () => clearTimeout(suspendTimeout)
        })

        return (
            <motion.div
                id="target"
                data-suspended={String(suspended())}
                style={{
                    width: 100,
                    height: 100,
                    background: "blue",
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 2 }}
                transition={{ duration: 10 }}
            />
        )
    }

    return (
        <Loading on={promise()} fallback={<div id="fallback">Suspended</div>}>
            <SuspendingChild />
        </Loading>
    )
}

describe("Animation resume after Suspense", () => {
    it("resets values to initial after Suspense remount", async () => {
        await visit(App)
        await wait(50)
        // Element should exist and be animating
        await should(() => query("#target"))

        // Wait for suspend — fallback should appear
        await should(
            () => expect(query("#fallback").textContent).toContain("Suspended"),
            { timeout: 2000 }
        )

        // Wait for resume — target should reappear
        await should(
            () => {
                const element = query("#target")
                // Right after remount, opacity should be reset to initial (0), not stuck at an
                // intermediate value from before suspension.
                const opacity = parseFloat(
                    window.getComputedStyle(element).opacity
                )
                expect(opacity).toBeLessThan(0.3)
            },
            { timeout: 2000 }
        )
    })
})
