import { fireEvent } from "@testing-library/dom"
import { render } from "../../jest.setup"
import { useDomEvent } from "../use-dom-event"

describe("useDomEvent refs", () => {
    test("listens on a plain `let` ref", () => {
        const handler = vi.fn()
        let element!: HTMLDivElement

        render(() => {
            useDomEvent(() => element, "pointerdown", handler)
            return <div ref={element} />
        })

        fireEvent.pointerDown(element)
        expect(handler).toHaveBeenCalledTimes(1)
    })

    test("listens on a `{ current }` ref", () => {
        const handler = vi.fn()
        const ref: { current: HTMLDivElement | null } = { current: null }

        render(() => {
            useDomEvent(ref, "pointerdown", handler)
            return <div ref={(el) => (ref.current = el)} />
        })

        fireEvent.pointerDown(ref.current!)
        expect(handler).toHaveBeenCalledTimes(1)
    })
})
