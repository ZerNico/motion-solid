/**
 * Port of upstream's `cypress/integration/waapi.ts` and the pages it visits,
 * `dev/react/src/tests/waapi-interrupt.tsx`, `waapi-zero-duration.tsx`,
 * `waapi-immediate-stop.tsx`, `waapi-interrupt-pregenerated-keyframes.tsx`,
 * `waapi-pregenerate-noop.tsx` and `waapi-sync.tsx`.
 */
import { createSignal, onSettled } from "solid-js"
import {
    animate,
    AsyncMotionValueAnimation,
    motion,
    motionValue,
    useMotionValue,
    type ValueAnimationTransition,
} from "../../src"
import { query, should, trigger, visit, wait } from "./utils"

/**
 * Port note: upstream checks that there's no `<iframe>`, i.e. that Vite's error overlay didn't
 * show up because of an uncaught error. Here uncaught errors are collected while the test runs
 * and asserted alongside (Vitest also fails on unhandled errors).
 */
function trackErrors() {
    const errors: unknown[] = []
    const onError = (event: ErrorEvent) => errors.push(event.error)
    const onRejection = (event: PromiseRejectionEvent) =>
        errors.push(event.reason)
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    onTestFinished(() => {
        window.removeEventListener("error", onError)
        window.removeEventListener("unhandledrejection", onRejection)
    })
    return errors
}

function expectNoErrorOverlay(errors: unknown[]) {
    expect(document.querySelectorAll("iframe").length).toBe(0)
    expect(errors).toEqual([])
}

const sectionStyle = {
    position: "relative",
    display: "flex",
    "flex-direction": "column",
    padding: "100px",
} as const

/**
 * `waapi-interrupt.tsx`
 */
function InterruptApp() {
    const [state, setState] = createSignal(false)

    return (
        <section style={sectionStyle}>
            <motion.div
                id="box"
                transition={{ duration: 1 }}
                initial={{ transform: "scale(1)", opacity: 1 }}
                animate={{
                    transform: `scale(${state() ? 1 : 2})`,
                    opacity: state() ? 1 : 0,
                }}
                onClick={() => setState(!state())}
                style={{
                    width: "100px",
                    height: "100px",
                    position: "relative",
                    top: "100px",
                    left: "100px",
                    backgroundColor: "red",
                    opacity: 1,
                }}
            >
                Content
            </motion.div>
        </section>
    )
}

/**
 * `waapi-zero-duration.tsx`
 */
function ZeroDurationApp() {
    const [state, setState] = createSignal(false)

    return (
        <section style={sectionStyle}>
            <motion.div
                id="box"
                transition={{ duration: 0 }}
                initial={{ transform: "scale(1)", opacity: 1 }}
                animate={{
                    transform: `scale(${state() ? 1 : 2})`,
                    opacity: state() ? 1 : 0,
                }}
                onClick={() => setState(!state())}
                style={{
                    width: "100px",
                    height: "100px",
                    position: "relative",
                    top: "100px",
                    left: "100px",
                    backgroundColor: "red",
                    opacity: 1,
                }}
            >
                Content
            </motion.div>
        </section>
    )
}

interface ExtendedMotionValue {
    owner: { current: HTMLDivElement | undefined; getProps: () => unknown }
}

interface ExtendedAnimation extends AsyncMotionValueAnimation<number> {
    _resolved: boolean
}

/**
 * `waapi-immediate-stop.tsx`
 */
function ImmediateStopApp() {
    let ref: HTMLDivElement | undefined

    onSettled(() => {
        if (!ref) return
        const opacity = motionValue(0)
        const extendedOpacity = opacity as unknown as ExtendedMotionValue
        extendedOpacity.owner = { current: ref, getProps: () => ({}) }

        const animation = new AsyncMotionValueAnimation({
            keyframes: [0, 1],
            motionValue: opacity,
            name: "opacity",
        })

        animation.stop()

        // If this animation resolved, that is incorrect
        const extendedAnimation = animation as unknown as ExtendedAnimation
        if (extendedAnimation._resolved) {
            ref.textContent = "Error"
        }

        new AsyncMotionValueAnimation({
            keyframes: [0.4, 0.5],
            motionValue: opacity,
            name: "opacity",
        })

        // Animation shouldn't fail if element is removed before keyframes resolve
        extendedOpacity.owner.current = undefined
    })

    return (
        <section style={sectionStyle}>
            <div
                ref={ref}
                id="box"
                style={{
                    width: "100px",
                    height: "100px",
                    position: "relative",
                    top: "100px",
                    left: "100px",
                    "background-color": "red",
                    opacity: 1,
                }}
            >
                Content
            </div>
        </section>
    )
}

const plainSectionStyle = {
    position: "relative",
    display: "flex",
    "flex-direction": "column",
} as const

/**
 * `waapi-interrupt-pregenerated-keyframes.tsx`
 */
function InterruptPregeneratedKeyframesApp() {
    const [state, setState] = createSignal(false)

    onSettled(() => {
        const timer = setTimeout(() => {
            setState(!state())
        }, 50)

        return () => {
            clearTimeout(timer)
        }
    })

    return (
        <section style={plainSectionStyle}>
            <motion.div
                id="box"
                transition={{ type: "spring" }}
                initial={{ clipPath: "inset(0px)" }}
                animate={{ clipPath: state() ? "inset(0px)" : "inset(20px)" }}
                style={{
                    width: "100px",
                    height: "100px",
                    position: "relative",
                    backgroundColor: "red",
                    opacity: 1,
                }}
            >
                Content
            </motion.div>
        </section>
    )
}

/**
 * `waapi-pregenerate-noop.tsx`
 */
function PregenerateNoopApp() {
    return (
        <section style={plainSectionStyle}>
            <motion.div
                id="box"
                transition={{
                    duration: 0.5,
                    delay: 2,
                    ease: (x: number) => x,
                }}
                initial={{ transform: "scale(1)" }}
                animate={{ transform: "scale(1)" }}
                style={{
                    width: "100px",
                    height: "100px",
                    position: "relative",
                    backgroundColor: "red",
                    opacity: 1,
                }}
            >
                Content
            </motion.div>
        </section>
    )
}

/**
 * `waapi-sync.tsx`
 */
function SyncApp() {
    const opacity = useMotionValue(0)

    let waapiRef: HTMLDivElement | undefined
    let syncRef: HTMLDivElement | undefined

    const waapiStartTime = useMotionValue("--")
    const syncStartTime = useMotionValue("--")
    const waapiExplicitStartTime = useMotionValue("--")
    const syncExplicitStartTime = useMotionValue("--")

    onSettled(() => {
        const settings: ValueAnimationTransition = {
            duration: 2,
            ease: "linear",
        }

        if (!waapiRef) return
        if (!syncRef) return

        const waapiAnimation = animate(waapiRef, { opacity: [0, 1] }, settings)
        const syncAnimation = animate(syncRef, { opacity: [0, 1] }, settings)

        const startTime = 101

        const waapiExplicitAnimation = animate(
            waapiRef,
            { filter: ["blur(0px)", "blur(1px)"] },
            { ...settings, startTime }
        )
        const syncExplicitAnimation = animate(
            syncRef,
            { x: [0, 100] },
            { ...settings, startTime }
        )

        const timeout = setTimeout(() => {
            waapiStartTime.set(
                waapiAnimation.startTime?.toString() ||
                    "waapi start time not available"
            )
            syncStartTime.set(
                syncAnimation.startTime?.toString() ||
                    "sync start time not available"
            )
            waapiExplicitStartTime.set(
                waapiExplicitAnimation.startTime?.toString() ||
                    "waapi explicit start time not available"
            )
            syncExplicitStartTime.set(
                syncExplicitAnimation.startTime?.toString() ||
                    "sync explicit start time not available"
            )
        }, 1000)

        return () => {
            waapiAnimation.stop()
            syncAnimation.stop()
            waapiExplicitAnimation.stop()
            syncExplicitAnimation.stop()
            clearTimeout(timeout)
        }
    })

    return (
        <section style={sectionStyle}>
            <motion.div
                ref={(el: HTMLDivElement) => (waapiRef = el)}
                style={{
                    width: "100px",
                    height: "100px",
                    backgroundColor: "red",
                    opacity: 0,
                }}
            />
            <motion.div
                ref={(el: HTMLDivElement) => (syncRef = el)}
                style={{
                    width: "100px",
                    height: "100px",
                    backgroundColor: "red",
                    opacity,
                    y: 0,
                }}
            />
            <motion.pre id="waapi-start-time" class="auto-timer waapi-timer">
                {waapiStartTime}
            </motion.pre>
            <motion.pre id="sync-start-time" class="auto-timer sync-timer">
                {syncStartTime}
            </motion.pre>
            <motion.pre
                id="waapi-explicit-start-time"
                class="explicit-timer waapi-timer"
            >
                {waapiExplicitStartTime}
            </motion.pre>
            <motion.pre
                id="sync-explicit-start-time"
                class="explicit-timer sync-timer"
            >
                {syncExplicitStartTime}
            </motion.pre>
        </section>
    )
}

describe("waapi", () => {
    it("Animations are correctly interrupted", async () => {
        await visit(InterruptApp)
        await wait(500)
        await should(() => {
            const element = query("#box")
            expect(getComputedStyle(element).opacity).not.toBe("1")
            expect(element.getBoundingClientRect().width).not.toBe(100)
        })
        trigger(query("#box"), "click", { x: 250, y: 250, force: true })
        await wait(100)
        await should(() => {
            const element = query("#box")
            expect(getComputedStyle(element).opacity).not.toBe("1")
            expect(Math.floor(element.getBoundingClientRect().width)).not.toBe(
                100
            )
        })
    })

    it("Default duration doesn't override duration: 0", async () => {
        await visit(ZeroDurationApp)
        await wait(50)
        await should(() => {
            const element = query("#box")
            expect(getComputedStyle(element).opacity).toBe("0")
            expect(element.getBoundingClientRect().width).toBe(200)
        })
        trigger(query("#box"), "click", { x: 250, y: 250, force: true })
        await wait(200)
        await should(() => {
            const element = query("#box")
            expect(getComputedStyle(element).opacity).toBe("1")
            expect(Math.floor(element.getBoundingClientRect().width)).toBe(100)
        })
    })

    it("Can stop before keyframes resolved", async () => {
        const errors = trackErrors()
        await visit(ImmediateStopApp)
        await wait(100)
        await should(() => {
            expect(query("#box").innerText).not.toBe("Error")
        })
        await should(() => expectNoErrorOverlay(errors))
    })

    it("Interrupt animations with pre-generated keyframes correctly", async () => {
        const errors = trackErrors()
        await visit(InterruptPregeneratedKeyframesApp)
        await wait(100)
        await should(() => expectNoErrorOverlay(errors))
    })

    it("Pregenerates no-op keyframes without error", async () => {
        const errors = trackErrors()
        await visit(PregenerateNoopApp)
        await wait(100)
        await should(() => expectNoErrorOverlay(errors))
    })

    // Skipping in CI as it's flaky
    it.skip("Should match WAAPI and main thread startTimes, and allow explicitly setting startTime", async () => {
        await visit(SyncApp)
        await wait(2000)
        // Automatically recorded startTime should be the same between main thread and WAAPI
        await should(() => {
            const [waapi, sync] = document.querySelectorAll(".auto-timer")
            expect(waapi.innerHTML).toBe(sync.innerHTML)
        })
        // Explicitly defined startTime should be the same between main thread and WAAPI
        await should(() => {
            const [waapi, sync] = document.querySelectorAll(".explicit-timer")
            expect(sync.innerHTML).toBe("101")
            expect(waapi.innerHTML).toBe("101")
            expect(waapi.innerHTML).toBe(sync.innerHTML)
        })
        // Explicitly defined startTime should not be the same as automatically defined startTime
        await should(() => {
            const [syncAuto, syncExplicit] =
                document.querySelectorAll(".sync-timer")
            expect(syncAuto.innerHTML).not.toBe(syncExplicit.innerHTML)
        })
        await should(() => {
            const [waapiAuto, waapiExplicit] =
                document.querySelectorAll(".waapi-timer")
            expect(waapiAuto.innerHTML).not.toBe(waapiExplicit.innerHTML)
        })
    })
})
