/**
 * Port of upstream's `cypress/integration/lazy-motion-react-m-subpath.ts` and its page,
 * `dev/react/src/tests/lazy-motion-react-m-subpath.tsx`.
 *
 * Port note: motion-solid has no `motion/react-m` subpath, `m` comes from the package entry.
 */
import { onSettled } from "solid-js"
import { domAnimation, LazyMotion, m } from "../../src"
import { query, should, visit, wait } from "./utils"

/**
 * Test for GitHub issue #3091
 *
 * LazyMotion (from `motion/react`) wrapping `m.div` from the `motion/react-m`
 * subpath. The LazyMotion-supplied renderer and feature definitions must reach
 * the m component even though the m components come from a separately-bundled
 * subpath, otherwise the m component renders nothing animated.
 */
function App() {
    let ref: HTMLDivElement | undefined

    onSettled(() => {
        const id = setTimeout(() => {
            if (ref && !ref.dataset.animationComplete) {
                ref.dataset.animationFailed = "true"
            }
        }, 1000)
        return () => clearTimeout(id)
    })

    return (
        <LazyMotion features={domAnimation}>
            <m.div
                id="box"
                ref={ref}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                onAnimationComplete={() => {
                    if (ref) {
                        ref.dataset.animationComplete = "true"
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

describe("LazyMotion with m components from /m subpath (issue #3091)", () => {
    it("animates m.div from framer-motion/m inside LazyMotion from framer-motion", async () => {
        await visit(App)
        await wait(500)
        await should(() => {
            const element = query("#box")
            expect(element.dataset.animationFailed).not.toBe("true")
            expect(element.dataset.animationComplete).toBe("true")
            expect(getComputedStyle(element).opacity).toBe("1")
        })
    })
})
