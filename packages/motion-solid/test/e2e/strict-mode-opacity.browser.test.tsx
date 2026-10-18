/**
 * Port of upstream's `cypress/integration/strict-mode-opacity.ts` and its page,
 * `dev/react/src/tests/strict-mode-opacity.tsx`.
 *
 * Port note: upstream renders the page in React.StrictMode (effects run, are cleaned up and run
 * again on mount). Solid has no StrictMode, so the page runs its effects once; the spec still
 * checks that an `autoplay: false` animation leaves the element at its initial opacity until it's
 * played.
 */
import { createEffect, createSignal, onSettled } from "solid-js"
import { useAnimate, type AnimationPlaybackControls } from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

function Test() {
    const [scope, animate] = useAnimate()
    let controls: AnimationPlaybackControls | null = null
    const [shouldAnimate, setShouldAnimate] = createSignal(false)

    onSettled(() => {
        controls = animate(
            scope.current,
            { opacity: 1 },
            { duration: 0.5, autoplay: false }
        )

        return () => controls?.stop()
    })

    createEffect(
        () => shouldAnimate(),
        (value) => {
            if (!controls || !value) return
            controls.play()
        }
    )

    return (
        <>
            <div
                id="box"
                ref={scope}
                style={{
                    width: "100px",
                    height: "100px",
                    background: "red",
                    opacity: 0,
                }}
            />
            <button id="trigger" onClick={() => setShouldAnimate(true)}>
                Animate
            </button>
        </>
    )
}

function App() {
    return <Test />
}

const opacity = () => parseFloat(window.getComputedStyle(query("#box")).opacity)

describe("StrictMode opacity animation", () => {
    it("element starts at opacity 0 when using single 'to' value with autoplay: false", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            expect(opacity()).toBe(0)
        })
    })

    it("element animates to opacity 1 when triggered", async () => {
        await visit(App)
        await wait(200)
        await should(() => {
            expect(opacity()).toBe(0)
        })
        trigger(query("#trigger"), "click")
        await wait(800)
        await should(() => {
            expect(opacity()).toBe(1)
        })
    })
})
