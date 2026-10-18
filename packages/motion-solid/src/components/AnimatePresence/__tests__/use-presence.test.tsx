import { createEffect, createSignal, flush } from "solid-js"
import { AnimatePresence } from ".."
import { render } from "../../../jest.setup"
import { Show } from "../control-flow"
import { usePresence } from "../use-presence"

type CB = () => void

const act = (callback: () => void) => {
    callback()
    flush()
}

describe("usePresence", () => {
    test("Can defer unmounting", async () => {
        const promise = new Promise<void>((resolve) => {
            let remove: CB

            const Child = () => {
                const [isPresent, safeToRemove] = usePresence()

                createEffect(isPresent, () => {
                    if (safeToRemove) remove = safeToRemove
                })

                return <div />
            }

            const [isVisible, setIsVisible] = createSignal(true)
            const Parent = () => (
                <AnimatePresence>
                    <Show when={isVisible()}>
                        <Child />
                    </Show>
                </AnimatePresence>
            )

            const { container } = render(() => <Parent />)

            act(() => setIsVisible(false))

            expect(container.firstChild).toBeTruthy()

            act(() => remove())

            setTimeout(() => {
                expect(container.firstChild).toBeFalsy()

                resolve()
            }, 150)
        })

        await promise
    })

    test("Multiple children can exit", async () => {
        const promise = new Promise<void>((resolve) => {
            let removeA: CB
            let removeB: CB

            const ChildA = () => {
                const [isPresent, safeToRemove] = usePresence()

                createEffect(isPresent, () => {
                    if (safeToRemove) removeA = safeToRemove
                })

                return <div />
            }

            const ChildB = () => {
                const [isPresent, safeToRemove] = usePresence()

                createEffect(isPresent, () => {
                    if (safeToRemove) removeB = safeToRemove
                })

                return <div />
            }

            const [isVisible, setIsVisible] = createSignal(true)
            const Parent = () => (
                <AnimatePresence>
                    <Show when={isVisible()}>
                        <div>
                            <ChildA />
                            <ChildB />
                        </div>
                    </Show>
                </AnimatePresence>
            )

            const { container } = render(() => <Parent />)
            act(() => setIsVisible(false))

            expect(container.firstChild).toBeTruthy()

            act(() => removeA())

            setTimeout(() => {
                expect(container.firstChild).toBeTruthy()

                act(() => removeB())

                setTimeout(() => {
                    expect(container.firstChild).toBeFalsy()

                    resolve()
                }, 100)
            }, 100)
        })

        await promise
    })

    test("Multiple children can exit over multiple rerenders", async () => {
        const promise = new Promise<void>((resolve) => {
            let removeA: CB
            let removeB: CB

            const ChildA = () => {
                const [isPresent, safeToRemove] = usePresence()

                createEffect(isPresent, () => {
                    if (safeToRemove) removeA = safeToRemove
                })

                return <div />
            }

            const ChildB = () => {
                const [isPresent, safeToRemove] = usePresence()

                createEffect(isPresent, () => {
                    if (safeToRemove) removeB = safeToRemove
                })

                return <div />
            }

            const [isVisible, setIsVisible] = createSignal(true)
            const Parent = () => (
                <AnimatePresence>
                    <Show when={isVisible()}>
                        <div>
                            <ChildA />
                            <ChildB />
                        </div>
                    </Show>
                </AnimatePresence>
            )

            const { container } = render(() => <Parent />)
            act(() => setIsVisible(false))

            expect(container.firstChild).toBeTruthy()

            act(() => removeA())

            // Port note: rerendering with identical props is a no-op in Solid, the
            // rerenders are re-setting the same value.
            setTimeout(() => {
                act(() => setIsVisible(false))

                setTimeout(() => {
                    expect(container.firstChild).toBeTruthy()
                    act(() => setIsVisible(false))
                    act(() => removeB())

                    setTimeout(() => {
                        expect(container.firstChild).toBeFalsy()

                        resolve()
                    }, 100)
                }, 100)
            }, 100)
        })

        await promise
    })

    test("Calling safeToRemove multiple times only triggers exit once", async () => {
        const promise = new Promise<void>((resolve) => {
            let safeToRemoveRef: CB
            let onExitCompleteCount = 0

            const Child = () => {
                const [isPresent, safeToRemove] = usePresence()

                createEffect(isPresent, () => {
                    if (safeToRemove) safeToRemoveRef = safeToRemove
                })

                return <div />
            }

            const [isVisible, setIsVisible] = createSignal(true)
            const Parent = () => (
                <AnimatePresence onExitComplete={() => onExitCompleteCount++}>
                    <Show when={isVisible()}>
                        <Child />
                    </Show>
                </AnimatePresence>
            )

            const { container } = render(() => <Parent />)

            act(() => setIsVisible(false))

            // Simulate rapid events calling safeToRemove multiple times
            act(() => {
                safeToRemoveRef()
                safeToRemoveRef()
                safeToRemoveRef()
            })

            setTimeout(() => {
                // onExitComplete should only be called once
                expect(onExitCompleteCount).toBe(1)
                // Child should be removed
                expect(container.firstChild).toBeFalsy()
                resolve()
            }, 150)
        })

        await promise
    })

    test("Rapid rerenders during exit only triggers exit once", async () => {
        const promise = new Promise<void>((resolve) => {
            let safeToRemoveRef: CB
            let onExitCompleteCount = 0

            const Child = () => {
                const [isPresent, safeToRemove] = usePresence()

                createEffect(isPresent, () => {
                    if (safeToRemove) safeToRemoveRef = safeToRemove
                })

                return <div />
            }

            const [isVisible, setIsVisible] = createSignal(true)
            const Parent = () => (
                <AnimatePresence onExitComplete={() => onExitCompleteCount++}>
                    <Show when={isVisible()}>
                        <Child />
                    </Show>
                </AnimatePresence>
            )

            const { container } = render(() => <Parent />)

            // Rapid re-renders with isVisible={false}
            act(() => setIsVisible(false))
            act(() => setIsVisible(false))
            act(() => setIsVisible(false))

            // Now call safeToRemove
            act(() => safeToRemoveRef())

            setTimeout(() => {
                // onExitComplete should only be called once
                expect(onExitCompleteCount).toBe(1)
                // Child should be removed
                expect(container.firstChild).toBeFalsy()
                resolve()
            }, 150)
        })

        await promise
    })

    test("Component can exit again after re-entering", async () => {
        const promise = new Promise<void>((resolve) => {
            let safeToRemoveRef: CB
            let onExitCompleteCount = 0

            const Child = () => {
                const [isPresent, safeToRemove] = usePresence()

                createEffect(isPresent, () => {
                    if (safeToRemove) safeToRemoveRef = safeToRemove
                })

                return <div />
            }

            const [isVisible, setIsVisible] = createSignal(true)
            const Parent = () => (
                <AnimatePresence onExitComplete={() => onExitCompleteCount++}>
                    <Show when={isVisible()}>
                        <Child />
                    </Show>
                </AnimatePresence>
            )

            const { container } = render(() => <Parent />)

            // First exit
            act(() => setIsVisible(false))
            act(() => safeToRemoveRef())

            setTimeout(() => {
                expect(onExitCompleteCount).toBe(1)
                expect(container.firstChild).toBeFalsy()

                // Re-enter
                act(() => setIsVisible(true))

                setTimeout(() => {
                    expect(container.firstChild).toBeTruthy()

                    // Second exit
                    act(() => setIsVisible(false))
                    act(() => safeToRemoveRef())

                    setTimeout(() => {
                        // onExitComplete should be called twice (once per exit cycle)
                        expect(onExitCompleteCount).toBe(2)
                        expect(container.firstChild).toBeFalsy()
                        resolve()
                    }, 150)
                }, 150)
            }, 150)
        })

        await promise
    })
})
