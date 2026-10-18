import { createSignal, flush } from "solid-js"
import { AnimatePresence } from ".."
import { render } from "../../../jest.setup"
import { Show } from "../control-flow"
// Port note: `usePresenceData` lives in `use-presence.ts` (returns an accessor).
import { usePresence, usePresenceData } from "../use-presence"

describe("usePresenceCustomData", () => {
    test("returns custom data passed to AnimatePresence", () => {
        const Child = () => {
            const data = usePresenceData()
            const [isPresent] = usePresence()
            return (
                <div
                    id="test-div"
                    style={{ opacity: isPresent() ? data() / 2 : data() }}
                />
            )
        }

        const [isVisible, setIsVisible] = createSignal(true)
        const Parent = () => (
            <AnimatePresence custom={0.5}>
                <Show when={isVisible()}>
                    <Child />
                </Show>
            </AnimatePresence>
        )

        const { container } = render(() => <Parent />)
        expect(container.querySelector("#test-div")).toHaveStyle({
            opacity: "0.25",
        })

        setIsVisible(false)
        flush()
        expect(container.querySelector("#test-div")).toHaveStyle({
            opacity: "0.5",
        })
    })

    test("returns undefined when not within AnimatePresence", () => {
        const Component = () => {
            const data = usePresenceData()
            return (
                <div id="test-div" data-value={data() === undefined ? 1 : 2} />
            )
        }

        const { container } = render(() => <Component />)
        expect(
            container.querySelector("#test-div")?.getAttribute("data-value")
        ).toBe("1")
    })
})
