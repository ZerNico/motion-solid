/**
 * Port of upstream's `jest.setup.tsx`: the event helpers and `render` the ported tests import.
 * The stubs it installs live in `test/upstream-setup.ts`.
 *
 * Port note: upstream wraps events in React's `act()`. Solid batches updates on the microtask
 * queue, so these `flush()` after dispatching instead. `render` takes a function returning JSX.
 */
import { fireEvent, getByTestId } from "@testing-library/dom"
import { render as testRender } from "@solidjs/testing-library"
import type { JSX } from "@solidjs/web"
import { flush } from "solid-js"

const act = (callback: () => void) => {
    callback()
    flush()
}

class PointerEventFake extends Event {
    constructor(type: any, props: any) {
        super(type, props)
        if (!props) return
        for (const prop of ["isPrimary", "pointerType", "button"]) {
            if (props[prop] !== null) (this as any)[prop] = props[prop]
        }
    }
}

export const click = (element: Element) =>
    act(() => {
        fireEvent.click(element)
    })
export const pointerEnter = (element: Element, options?: any) =>
    act(() => {
        fireEvent.pointerEnter(
            element,
            // Emulate buttonless pointer event for enter/leave
            new PointerEventFake("pointerenter", {
                pointerType: "mouse",
                button: -1,
                ...options,
            })
        )
    })
export const pointerLeave = (element: Element, options?: any) =>
    act(() => {
        fireEvent.pointerLeave(
            element,
            new PointerEventFake("pointerleave", {
                pointerType: "mouse",
                button: -1,
                ...options,
            })
        )
    })
export const pointerDown = (element: Element) =>
    act(() => {
        fireEvent.pointerDown(
            element,
            new PointerEventFake("pointerdown", { isPrimary: true })
        )
    })
export const pointerUp = (element: Element) =>
    act(() => {
        fireEvent.pointerUp(
            element,
            new PointerEventFake("pointerup", { isPrimary: true })
        )
    })
export const pointerMove = (element: Element) =>
    act(() => {
        fireEvent.pointerMove(
            element,
            new PointerEventFake("pointermove", { isPrimary: true })
        )
    })
export const pointerCancel = (element: Element) =>
    act(() => {
        fireEvent.pointerCancel(
            element,
            new PointerEventFake("pointercancel", { isPrimary: true })
        )
    })
export const focus = (element: HTMLElement, testId: string) =>
    act(() => {
        getByTestId(element, testId).focus()
    })
export const blur = (element: HTMLElement, testId: string) =>
    act(() => {
        getByTestId(element, testId).blur()
    })

export const render = (children: () => JSX.Element) => {
    const result = testRender(children)
    flush()
    return result
}
