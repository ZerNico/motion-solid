/**
 * Port of upstream's `cypress/integration/suspense-reveal-memoized.ts` and its page,
 * `dev/react/src/tests/suspense-reveal-memoized.tsx`.
 *
 * Port note: `Suspense` is `<Loading>`. The suspending sibling (throwing a promise kept in its
 * state) reads an async memo of that state. Solid's `Loading` keeps already-shown content on
 * screen while it revalidates, so the boundary declares the state as a dependency (`on`) to show
 * its fallback again, like React's re-suspended boundary. The `motion.div` never re-runs, like
 * the memoized element upstream.
 */
import { createMemo, createSignal, Loading } from "solid-js"
import { motion } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

const getOpacity = (element: Element) =>
    parseFloat(window.getComputedStyle(element).opacity)

function App() {
    const [promise, setPromise] = createSignal<Promise<void> | null>(null)
    const suspended = createMemo(() => {
        const pending = promise()
        return pending ? pending.then(() => false) : false
    })

    const Suspender = () => (
        <button
            id="suspend"
            data-suspended={String(suspended())}
            onClick={() => {
                const pending = new Promise<void>((resolve) =>
                    setTimeout(() => {
                        setPromise(null)
                        resolve()
                    }, 500)
                )
                setPromise(pending)
            }}
        >
            Suspend
        </button>
    )

    return (
        <Loading on={promise()} fallback={<div id="fallback">Suspended</div>}>
            <Suspender />
            <motion.div
                id="box"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ width: 100, height: 100, background: "blue" }}
            />
        </Loading>
    )
}

describe("Suspense reveal of memoized content", () => {
    it("replays the enter animation when a re-suspended boundary reveals", async () => {
        await visit(App)
        await should(() => expect(getOpacity(query("#box"))).toBe(1))
        trigger(query("#suspend"), "click", { x: 1, y: 1, force: true })
        await should(() => query("#fallback"))
        await should(
            () => expect(document.querySelector("#fallback")).toBeNull(),
            { timeout: 2000 }
        )
        await wait(500)
        expect(getOpacity(query("#box"))).toBe(1)
    })
})
