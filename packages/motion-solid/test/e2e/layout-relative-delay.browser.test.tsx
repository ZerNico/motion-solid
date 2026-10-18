/**
 * Port of upstream's `cypress/integration/layout-relative-delay.ts` and its page,
 * `dev/react/src/tests/layout-relative-delay.tsx`.
 */
import { createSignal } from "solid-js"
import { domMax, LazyMotion, m } from "../../src"
import { expectBbox, query, should, trigger, visit, wait } from "./utils"

function App() {
    const [state, setState] = createSignal(true)
    // Port note: upstream re-creates this counter (and the `ease` reading it) on every render.
    // The page renders once before the click, so one counter is equivalent here.
    let frameCount = 0
    return (
        <LazyMotion features={domMax}>
            <m.div
                id="parent"
                onClick={() => setState(!state())}
                layout
                style={{
                    position: "absolute",
                    top: state() ? 0 : 200,
                    left: state() ? 0 : 200,
                    width: state() ? 200 : 400,
                    height: 200,
                    background: "red",
                }}
                transition={{
                    ease: (t: number) => {
                        frameCount++
                        // This is a bit funny but boxes are resolved relatively after
                        // the first frame
                        return frameCount > 1 ? 0.5 : t
                    },
                }}
            >
                <m.div
                    id="child"
                    layout
                    style={{
                        width: state() ? 100 : 200,
                        height: 100,
                        background: "blue",
                    }}
                    transition={{
                        delay: 100,
                    }}
                />
            </m.div>
        </LazyMotion>
    )
}

describe("Relative projection targets: Delay", () => {
    it("Child correctly follows parent", async () => {
        await visit(App)
        await wait(50)
        await should(() =>
            expectBbox(query("#parent"), {
                top: 0,
                left: 0,
                width: 200,
                height: 200,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 0,
                left: 0,
                width: 100,
                height: 100,
            })
        )
        trigger(query("#parent"), "click")
        await wait(50)
        await should(() =>
            expectBbox(query("#parent"), {
                top: 100,
                left: 100,
                width: 300,
                height: 200,
            })
        )
        await should(() =>
            expectBbox(query("#child"), {
                top: 100,
                left: 100,
                width: 100,
                height: 100,
            })
        )
    })
})
