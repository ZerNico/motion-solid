import { renderHook } from "@solidjs/testing-library"
import {
    createEffect,
    createSignal,
    flush,
    onSettled,
    type Setter,
} from "solid-js"
import { motion, MotionGlobalConfig, motionValue } from "../.."
import { render } from "../../jest.setup"
import { useInstantTransition } from "../use-instant-transition"

// Port note: upstream's `act()`.
const act = (callback: () => void) => {
    callback()
    flush()
}

describe("useInstantTransition", () => {
    test("Disables animations for a single render", async () => {
        const values = await new Promise((resolve) => {
            const xParent = motionValue(0)
            const xComponent = motionValue(0)
            const xChild = motionValue(0)

            const Parent = () => {
                const [state, setState] = createSignal(false)

                return (
                    <motion.div
                        initial={false}
                        animate={{ x: state() ? 50 : 0 }}
                        transition={{ duration: 10 }}
                        style={{ x: xParent }}
                    >
                        <Component state={state()} setState={setState} />
                    </motion.div>
                )
            }

            const Component = (props: {
                state: boolean
                setState: Setter<boolean>
            }) => {
                const startInstantTransition = useInstantTransition()

                onSettled(() => {
                    // Port note: `flush()` (upstream's `act()`) can't run inside an effect: the
                    // update is applied in this flush's continuation.
                    startInstantTransition(() => props.setState(true))

                    const timeout = setTimeout(() => {
                        resolve([xParent.get(), xComponent.get(), xChild.get()])
                    }, 100)

                    return () => clearTimeout(timeout)
                })

                return (
                    <motion.div
                        initial={false}
                        animate={{ x: props.state ? 100 : 0 }}
                        transition={{ duration: 10 }}
                        style={{ x: xComponent }}
                    >
                        <Child state={props.state} />
                    </motion.div>
                )
            }

            const Child = (props: { state: boolean }) => {
                return (
                    <motion.div
                        initial={false}
                        animate={{ x: props.state ? 200 : 0 }}
                        transition={{ duration: 10 }}
                        style={{ x: xChild }}
                    />
                )
            }

            // Port note: upstream re-renders here, a no-op in Solid.
            render(() => <Parent />)
        })

        expect(values).toEqual([50, 100, 200])
    })

    test("Reenable animations on subsequent renders", async () => {
        const values = await new Promise((resolve) => {
            const xParent = motionValue(0)
            const xComponent = motionValue(0)
            const xChild = motionValue(0)

            const Parent = () => {
                const [state, setState] = createSignal(0)
                const xTargets = [0, 50, 100]
                return (
                    <motion.div
                        initial={false}
                        animate={{ x: xTargets[state()] }}
                        transition={{ duration: 10 }}
                        style={{ x: xParent }}
                    >
                        <Component state={state()} setState={setState} />
                    </motion.div>
                )
            }

            const Component = (props: {
                state: number
                setState: Setter<number>
            }) => {
                const startInstantTransition = useInstantTransition()
                const xTargets = [0, 100, 200]

                createEffect(
                    () => props.state,
                    (state) => {
                        let timeout: NodeJS.Timeout
                        if (state === 0) {
                            // Port note: `flush()` (upstream's `act()`) can't run inside an
                            // effect: the update is applied in this flush's continuation.
                            startInstantTransition(() => props.setState(1))
                        } else if (state === 1) {
                            timeout = setTimeout(() => {
                                act(() => props.setState(2))
                            }, 100)
                        } else if (state === 2) {
                            timeout = setTimeout(() => {
                                resolve([
                                    xParent.get(),
                                    xComponent.get(),
                                    xChild.get(),
                                ])
                            }, 100)
                        }

                        return () => clearTimeout(timeout)
                    }
                )

                return (
                    <motion.div
                        initial={false}
                        animate={{ x: xTargets[props.state] }}
                        transition={{ duration: 10 }}
                        style={{ x: xComponent }}
                    >
                        <Child state={props.state} />
                    </motion.div>
                )
            }

            const Child = (props: { state: number }) => {
                const xTargets = [0, 200, 400]

                return (
                    <motion.div
                        initial={false}
                        animate={{ x: xTargets[props.state] }}
                        transition={{ duration: 10 }}
                        style={{ x: xChild }}
                    />
                )
            }

            // Port note: upstream re-renders here, a no-op in Solid.
            render(() => <Parent />)
        })

        expect(values).not.toEqual([100, 200, 400])
    })

    test("transitions stay blocked when called on multiple frames back-to-back", async () => {
        const { result } = renderHook(() => useInstantTransition())

        act(() => result(() => {}))
        expect(MotionGlobalConfig.instantAnimations).toBe(true)

        const promise = createResolvablePromise()

        // On the next frame, call the callback again.
        requestAnimationFrame(() => {
            act(() => result(() => {}))

            requestAnimationFrame(() => {
                // If we hadn't called the callback a second time, we would have expected this to be `false` on this frame.
                expect(MotionGlobalConfig.instantAnimations).toBe(true)
                requestAnimationFrame(() => {
                    // Finally 2 frames have passed since the final call to
                    // start an instant transition, so we expect the state to be
                    // unblocked.
                    expect(MotionGlobalConfig.instantAnimations).toBe(false)
                    promise.resolve()
                })
            })
        })

        await promise
    })
})

type ResolvablePromise<T = void> = Promise<T> & {
    resolve: (value: T) => void
    reject: (reason?: unknown) => void
}

function createResolvablePromise<T = void>(): ResolvablePromise<T> {
    let resolvePromise: any, rejectPromise: any
    const promise: any = new Promise((resolve, reject) => {
        resolvePromise = resolve
        rejectPromise = reject
    })
    promise.resolve = resolvePromise
    promise.reject = rejectPromise
    return promise
}
