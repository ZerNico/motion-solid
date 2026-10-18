import { addDomEvent } from "motion-dom"
import { createEffect } from "solid-js"
import { resolveRef, type ElementRef } from "../utils/refs"

/**
 * Attaches an event listener directly to the provided element.
 *
 * Port note: takes an element, an accessor of one or a `{ current }` object instead of a React
 * ref.
 *
 * @public
 */
export function useDomEvent(
    ref: ElementRef<EventTarget>,
    eventName: string,
    handler?: EventListener | undefined,
    options?: AddEventListenerOptions
) {
    /**
     * Port note: the ref is read in the compute (so an accessor of a signal is tracked) and read
     * again in the apply, once the component's elements exist: a plain `let` ref or a
     * `{ current }` object isn't set yet when the compute first runs.
     */
    createEffect(
        () => [resolveRef(ref)],
        () => {
            const element = resolveRef(ref)
            if (handler && element) {
                return addDomEvent(element, eventName, handler, options)
            }
        }
    )
}
