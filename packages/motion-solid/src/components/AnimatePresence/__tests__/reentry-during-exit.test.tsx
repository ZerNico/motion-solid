import { MotionGlobalConfig } from "motion-utils"
import { createSignal, flush } from "solid-js"
import { AnimatePresence, motion } from "../../.."
import { PresenceContext } from "../../../context/PresenceContext"
import { nextFrame as frame } from "../../../gestures/__tests__/utils"
import { render } from "../../../jest.setup"
import { Show } from "../control-flow"

const act = (callback: () => void) => {
    callback()
    flush()
}

describe("AnimatePresence re-entry during exit", () => {
    beforeEach(() => {
        MotionGlobalConfig.instantAnimations = true
    })
    afterEach(() => {
        MotionGlobalConfig.instantAnimations = false
    })

    test("first child of initial={false} doesn't get stuck at initial when its previous exit resolved after re-entry", async () => {
        const [mode, setMode] = createSignal<"bar" | "panel">("bar")

        const Island = () => {
            return (
                <AnimatePresence mode="popLayout" initial={false}>
                    <Show when={mode()} keyed>
                        {(mode) => (
                            <motion.div
                                data-testid={mode}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                            />
                        )}
                    </Show>
                </AnimatePresence>
            )
        }

        const { getByTestId } = render(() => <Island />)
        const bar = () => getByTestId("bar") as HTMLElement

        // Exit resolves on the next frame, after the element has re-entered
        act(() => setMode("panel"))
        act(() => setMode("bar"))
        await frame()
        flush()
        expect(bar().style.opacity).toBe("1")

        act(() => setMode("panel"))
        act(() => setMode("bar"))
        await frame()
        flush()
        await frame()
        flush()

        expect(bar().style.opacity).toBe("1")
        expect(
            bar().style.transform === "none" || bar().style.transform === ""
        ).toBe(true)
    })

    test("an exit that resolves after re-entry doesn't report exit complete", async () => {
        const onExitComplete = jest.fn()
        const [isPresent, setIsPresent] = createSignal(true)
        const context = {
            id: "child",
            isPresent,
            initial: undefined,
            custom: () => undefined,
            onExitComplete,
            register: () => () => {},
        }
        const Component = () => (
            <PresenceContext value={context}>
                <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                />
            </PresenceContext>
        )

        render(() => <Component />)
        onExitComplete.mockClear()

        act(() => setIsPresent(false))
        act(() => setIsPresent(true))
        await frame()
        flush()
        await frame()
        flush()

        expect(onExitComplete).not.toHaveBeenCalled()
    })

    test("first child of initial={false} replays its enter when re-entering after its exit completed", async () => {
        MotionGlobalConfig.instantAnimations = false

        const [isVisible, setIsVisible] = createSignal(true)
        const Component = () => (
            <AnimatePresence initial={false}>
                <Show when={isVisible()}>
                    <div>
                        <motion.div
                            data-testid="fast"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{
                                opacity: 0,
                                transition: { duration: 0.05 },
                            }}
                            transition={{ duration: 0.05 }}
                        />
                        <motion.div
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 10 } }}
                        />
                    </div>
                </Show>
            </AnimatePresence>
        )

        const { getByTestId } = render(() => <Component />)
        const fast = () => getByTestId("fast") as HTMLElement
        expect(fast().style.opacity).toBe("1")

        act(() => setIsVisible(false))
        await new Promise((resolve) => setTimeout(resolve, 200))
        flush()
        expect(fast().style.opacity).toBe("0")

        act(() => setIsVisible(true))
        await new Promise((resolve) => setTimeout(resolve, 200))
        flush()
        expect(fast().style.opacity).toBe("1")
    })
})
