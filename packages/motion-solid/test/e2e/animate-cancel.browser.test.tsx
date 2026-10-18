/**
 * Port of upstream's `cypress/integration/animate-cancel.ts` and its page,
 * `dev/react/src/tests/animate-cancel.tsx`.
 */
import { onSettled } from "solid-js"
import { useAnimate } from "../../src"
import { query, should, visit, wait } from "./utils"

/**
 * Port note: upstream renders the page in React's `<StrictMode>`, which runs the effect, its
 * cleanup (so `controls.cancel()`), then the effect again, on the same element. Solid has no
 * StrictMode, so this helper reproduces that sequence for the effect.
 */
function onSettledStrict(effect: () => () => void) {
    onSettled(() => {
        effect()()
        return effect()
    })
}

function Test() {
    const [scope, animate] = useAnimate()

    onSettledStrict(() => {
        const controls = animate(scope.current, { opacity: 0 }, { duration: 2 })
        return () => {
            try {
                controls.cancel()
            } catch (e) {
                if (scope.current) {
                    scope.current.innerHTML = "error"
                }
                console.error(e)
            }
        }
    })

    return (
        <div
            ref={scope}
            class="box"
            style={{ width: "2rem", height: "2rem", background: "red" }}
        />
    )
}

function App() {
    return <Test />
}

describe("animation.cancel()", () => {
    it("Doesn't throw error on unmount", async () => {
        await visit(App)
        await wait(100)
        await should(() => {
            expect(query(".box").textContent).not.toContain("error")
        })
    })
})
