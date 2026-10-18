/**
 * Port of upstream's `cypress/integration/variant-propagation-suspense.ts` and its page,
 * `dev/react/src/tests/variant-propagation-suspense.tsx`.
 *
 * Port note: `Suspense` is `<Loading>`, `React.lazy` is Solid's `lazy` (created per page, like a
 * fresh page load), the `useLayoutEffect` that shows the parent is `onSettled`.
 */
import type { Component } from "solid-js"
import { createSignal, lazy, Loading, onSettled, Show } from "solid-js"
import { motion } from "../../src"
import { query, should, visit, wait } from "./utils"

const childVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 2 } },
}

const parentVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 2 } },
}

function App() {
    // Simulate a lazy-loaded child — module load takes ~100ms
    const LazyChild = lazy(
        () =>
            new Promise<{ default: Component }>((resolve) => {
                setTimeout(() => {
                    resolve({
                        default: () => (
                            <motion.div id="child" variants={childVariants} />
                        ),
                    })
                }, 100)
            })
    )

    const [show, setShow] = createSignal(false)

    // Defer to trigger enter animation rather than appear
    onSettled(() => {
        setShow(true)
    })

    return (
        <div>
            <Show when={show()}>
                <motion.div
                    id="parent"
                    initial="hidden"
                    animate="visible"
                    variants={parentVariants}
                >
                    <Loading fallback={<div id="fallback">Loading...</div>}>
                        <LazyChild />
                    </Loading>
                </motion.div>
            </Show>
        </div>
    )
}

describe("Variant propagation to lazy-loaded Suspense children", () => {
    it("child should animate from initial variant, not jump to animate values", async () => {
        await visit(App)
        // Wait for the lazy module to load and the child to mount, then check immediately
        // after mount — opacity should be near 0, not 1 (which would mean it skipped the
        // animation)
        await should(
            () => {
                const opacity = parseFloat(query("#child").style.opacity)
                expect(opacity).toBeLessThan(0.5)
            },
            { timeout: 2000 }
        )
    })

    it("child should reach final animate variant values after animation completes", async () => {
        await visit(App)
        await should(() => query("#child"), { timeout: 2000 })
        // After ~3s total (100ms load + 2s animation + buffer), should be at 1
        await wait(3000)
        await should(() => {
            const opacity = parseFloat(query("#child").style.opacity)
            expect(opacity).toBe(1)
        })
    }, 10000)
})
