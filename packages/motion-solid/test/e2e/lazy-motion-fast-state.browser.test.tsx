/**
 * Port of upstream's `cypress/integration/lazy-motion-fast-state.ts` and its page,
 * `dev/react/src/tests/lazy-motion-fast-state.tsx`.
 */
import { createSignal, onSettled } from "solid-js"
import { domAnimation, LazyMotion, m } from "../../src"
import { query, should, visit, wait } from "./utils"

/**
 * Test for GitHub issue #2759
 * When LazyMotion features load asynchronously and state changes occur before
 * features load, the enter animation should still fire (not snap to final value).
 */

const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
}

function App() {
    const [isVisible, setIsVisible] = createSignal(false)
    let boxRef: HTMLDivElement | undefined

    // Simulate state change that occurs before features load
    onSettled(() => {
        const timer = setTimeout(() => {
            setIsVisible(true)
        }, 5) // State changes after 5ms
        return () => clearTimeout(timer)
    })

    return (
        <LazyMotion
            features={() =>
                new Promise((resolve) => {
                    // Features load after 50ms (longer than the 5ms state change)
                    setTimeout(() => {
                        resolve(domAnimation)
                    }, 50)
                })
            }
        >
            <m.div
                id="box"
                ref={boxRef}
                initial={false}
                animate={isVisible() ? "visible" : "hidden"}
                variants={variants}
                transition={{ duration: 0.1 }}
                onAnimationComplete={() => {
                    if (boxRef) {
                        boxRef.dataset.animationComplete = "true"
                    }
                }}
                style={{
                    width: 100,
                    height: 100,
                    background: "red",
                }}
            />
        </LazyMotion>
    )
}

describe("LazyMotion with fast state changes", () => {
    it("animates when state changes before features load", async () => {
        await visit(App)
        await wait(300) // Wait for features to load and animation to complete
        await should(() => {
            const element = query("#box")
            // Verify the animation completed
            expect(element.dataset.animationComplete).toBe("true")
            // Verify the element is visible (opacity: 1)
            expect(getComputedStyle(element).opacity).toBe("1")
        })
    })
})
