import { fireEvent } from "@testing-library/dom"
import { createSignal, onSettled } from "solid-js"
import { render } from "../../jest.setup"
import { useDomEvent } from "../use-dom-event"

describe("useDomEvent", () => {
    it("should handle the ref not being set correctly", () => {
        // TODO maybe show a warning too?
        const handler = jest.fn()
        const Component = () => {
            // Port note: a signal set by a ref callback replaces `useRef`.
            const [ref] = createSignal<Element | null>(null)
            useDomEvent(ref, "pointerdown", handler)
            return <div />
        }
        // Port note: upstream re-renders here, a no-op in Solid.
        const { container } = render(() => <Component />)
        fireEvent.pointerDown(container.firstChild as Element)
        expect(handler).not.toHaveBeenCalled()
    })
    it("should call the handler when the event is fired", () => {
        const handler = jest.fn()
        const Component = () => {
            // Port note: a signal set by a ref callback replaces `useRef`.
            const [ref, setRef] = createSignal<Element | null>(null)
            useDomEvent(ref, "pointerdown", handler)
            return <div ref={setRef} />
        }
        // Port note: upstream re-renders here, a no-op in Solid.
        const { container } = render(() => <Component />)
        fireEvent.pointerDown(container.firstChild as Element)
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("should fire an event on another element in the ref", async () => {
        const handler = jest.fn()
        const promise = new Promise<void>((resolve) => {
            const Component = () => {
                const ref = { current: document.body }
                useDomEvent(ref, "pointerdown", handler)
                onSettled(() => resolve())
                return <div />
            }
            // Port note: upstream re-renders here, a no-op in Solid.
            render(() => <Component />)
            fireEvent.pointerDown(document.body)
        })
        await expect(promise).resolves.toEqual(undefined)
        expect(handler).toHaveBeenCalled()
    })
    it("should not fire an event if the component has been unmounted", async () => {
        const handler = jest.fn()
        const promise = new Promise<void>((resolve) => {
            const Component = () => {
                const ref = { current: document.body }
                useDomEvent(ref, "pointerdown", handler)
                return <div />
            }
            // Port note: upstream re-renders here, a no-op in Solid.
            const { unmount } = render(() => <Component />)
            unmount()
            requestAnimationFrame(() => {
                fireEvent.pointerDown(document.body)
                resolve()
            })
        })
        await expect(promise).resolves.toEqual(undefined)
        expect(handler).not.toHaveBeenCalled()
    })
})
